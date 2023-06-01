//Initialize empty objects for clients and games, and define the win conditions 
//as an array of arrays representing the rows, columns, and diagonals that can 
//lead to a win:
var clients = {}
var games = {}
const winCon = [[0, 1, 2],[3, 4, 5],[6, 7, 8],[0, 3, 6],
                [1, 4, 7],[2, 5, 8],[0, 4, 8],[2, 4, 6]]

//Create a WebSocket server listening on port 8080:
const http = require('http').createServer().listen(8080, console.log('listening on port 8080'))
const server = require('websocket').server
const socket = new server({'httpServer': http})

// Handle incoming WebSocket requests and create a new client connection when a 
//new client connects. The server generates a random client ID, associates it with 
//the client's WebSocket connection, sends a 'connected' message to the client, and 
//sends an updated list of available games to all clients:
socket.on('request', (req) =>{
    const conn = req.accept(null, req.origin)
    const clientId = Math.round(Math.random() * 100) + Math.round(Math.random() * 100) + Math.round(Math.random() * 100)
    clients[clientId] = { 'conn' : conn }
    conn.send(JSON.stringify({
        'tag':'connected',
        'clientId' : clientId
    }))
    sendAvailGames()
    conn.on('message', onMessage)
})

function sendAvailGames(){
    const gameList = []
    for (const game in games){
        if (games[game].players.length < 2)
            gameList.push(game)
    }

    for (const client in clients)
        clients[client].conn.send(JSON.stringify({
            'tag' : 'gameList',
            'list' : gameList
        }))
}

//Handle incoming WebSocket messages and take different actions depending on the 
//message tag:
function onMessage(msg){
    const data = JSON.parse(msg.utf8Data)
    switch(data.tag){
        //'create': create a new game with a random game ID, a blank board, 
        //and the player who created the game as the first player (with symbol 'x'). 
        //The server sends a 'created' message to the client with the new game ID 
        //and an updated list of available games to all clients.
        case 'create':
            const gameId = Math.round(Math.random() * 100) + Math.round(Math.random() * 100) + Math.round(Math.random() * 100)
            const board = ['', '', '', '', '', '', '', '', '']
            var player = {
                'clientId' : data.clientId,
                'symbol' : 'x',
                'isTurn' : true
            }
            const players = Array(player)
            games[gameId] = {
                'board': board,
                'players' : players
            }
            clients[data.clientId].conn.send(JSON.stringify({
                'tag' : 'created',
                'gameId' : gameId
            }))
            sendAvailGames()
            break

        //'join': add a new player to an existing game and send a 'joined' 
        //message to all players in the game with the new player's symbol ('o'). 
        //If the game now has two players, update the board and start the game.
        case 'join' :
            player = {
                'clientId' : data.clientId,
                'symbol' : 'o',
                'isTurn' : false
            }    
            games[data.gameId].players.push(player)
            sendAvailGames()
            games[data.gameId].players.forEach(player =>{
                clients[player.clientId].conn.send(JSON.stringify({
                    'tag' : 'joined',
                    'gameId' : data.gameId,
                    'symbol' : player.symbol
                }))
            })
            updateBoard(data.gameId)
            break

        //'moveMade': update the board with the move made by the current player. 
        //Check if the move leads to a win or a draw. 
        case 'moveMade' :
            games[data.gameId].board = data.board

            const winner = winState(data.gameId)
            const isDraw = drawState(data.gameId)

            //If there is a winner, send a 'winner' message to all players 
            //in the game with the winning player's ID.
            if(winner){
                games[data.gameId].players.forEach(player=>{
                    clients[player.clientId].conn.send(JSON.stringify({
                        'tag' : 'winner',
                        'winner' : player.symbol === winner.symbol ? player.clientId : null
                    }))
                })
            }
            //If there is a draw, send a 'gameDraw' message to all players in the game. 
            else if(isDraw){
                games[data.gameId].players.forEach(player=>{
                    clients[player.clientId].conn.send(JSON.stringify({
                        'tag' : 'gameDraw'
                    }))
                })
            }
            //If the game continues, update the board and change the turn of the 
            //players.
            else{
                games[data.gameId].players.forEach(player=>{
                    player.isTurn = !player.isTurn
                })
                updateBoard(data.gameId)
            }
            break
    }
}

function updateBoard(gameId){
    games[gameId].players.forEach(player=>{
        clients[player.clientId].conn.send(JSON.stringify({
            'tag' : 'updateBoard',
            'isTurn' : player.isTurn,
            'board' : games[gameId].board
        }))
    })
}

function winState(gameId){
    for (const row of winCon) {
      const symbols = row.map(cell => games[gameId].board[cell])
      const firstSymbol = symbols[0]
      if (firstSymbol !== '' && symbols.every(symbol => symbol === firstSymbol)) {
        const winner = games[gameId].players.find(player => player.symbol === firstSymbol)
        if (winner) {
          return winner
        }
      }
    }
    return null
  }

function drawState(gameId){
    return winCon.every(row=>{
        return (row.some(cell=>{
                return games[gameId].board[cell] =='x'
            }) && 
            row.some(cell=>{
                return games[gameId].board[cell] =='o'
            })
        )
    })
}