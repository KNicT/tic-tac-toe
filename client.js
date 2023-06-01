let clientId = Math.floor(Math.random() * 1000);
//This generates a random integer between 0 and 999 to be used as the client ID.

let gameId = null;
//This variable will be used to store the ID of the game the user joins or creates.
let symbol = null;
//This variable will store the symbol (X or O) that the user is assigned after joining 
//a game.
let socket = null;
//This variable will store the WebSocket object that is used to communicate with the 
//server.

const create = document.querySelector('.newGame')
//Selects the "New Game" button from the HTML document and stores it in a constant 
//variable.
create.disabled = true  
//Sisables the "New Game" button by default, as the user has not connected to the 
//server yet.

const join = document.querySelector('.joinBtn')
//Selects the "Join" button from the HTML document and stores it in a constant 
//variable.
join.disabled = true
//Disables the "Join" button by default, as the user has not connected to the 
//server yet.
join.addEventListener('click', () => {
//Adds a click event listener to the "Join" button. When the button is clicked, 
//the function inside the curly braces is executed.
    socket.send(JSON.stringify({
        'tag' : 'join',
        'clientId' : clientId,
        'gameId' : gameId
    }))
})

const cells = document.querySelectorAll('.cell') 
//Selects all the cells of the game board from the HTML document and stores 
//them in a constant variable.
const board = document.querySelector('.board')
//Selects the game board from the HTML document and stores it in a constant variable.
const list = document.querySelector('ul')
//Selects the unordered list from the HTML document and stores it in a constant 
//variable.
const sidebar = document.querySelector('.sidebar')
//Selects the sidebar from the HTML document and stores it in a constant variable.
const connect = document.querySelector('.cntBtn')
//Selects the "Connect" button from the HTML document and stores it in a constant 
//variable.

connect.addEventListener('click', (src) => {
//Adds a click event listener to the "Connect" button. When the button is clicked, 
//the function inside the curly braces is executed.
    socket = new WebSocket('ws://localhost:8080')
    socket.onmessage = onMessage
    src.target.disabled = true
})


function onMessage(msg){
//This function handles the messages received from the server.
    const data = JSON.parse(msg.data)
    switch (data.tag){
        case 'connected':
            clientId = data.clientId
            const lbl = document.createElement('label')
            lbl.innerText = data.clientId
            lbl.style.textAlign = 'center'
            sidebar.insertBefore(lbl, connect)
            create.disabled = false
            join.disabled = false
            break

        case 'gameList' : 
            const games = data.list
            while(list.firstChild){
                list.removeChild(list.lastChild)
            }
            games.forEach( game => {
                const li = document.createElement('li')
                li.innerText = game
                li.style.textAlign = 'center'
                list.appendChild(li)
                li.addEventListener('click', () => {gameId = game})
            })
            break

        case 'created':
            gameId = data.gameId
            create.disabled = true
            join.disabled = true
            break

        case 'joined' :
            document.querySelector('.board').style.display='grid'
            symbol = data.symbol
            if(symbol == 'x')
                board.classList.add('cross')
            else 
                board.classList.add('circle')   
            makeMove()
            break

        case 'updateBoard':
            cells.forEach((cell, index) => {
                if (data.board[index] === 'x') {
                    cell.classList.add('cross')
                } else if (data.board[index] === 'o') {
                    cell.classList.add('circle')
                } else {
                    cell.classList.remove('cross', 'circle')
                    if (data.isTurn) {
                        cell.addEventListener('click', cellClicked)
                    } else {
                        cell.removeEventListener('click', cellClicked)
                    }
                }
            })
            break;
            
        case 'winner' :
            alert(`Winner : ${data.winner}`)
            break
        case 'gameDraw':
            alert('DRAW! Nobody Wins!')
            break
    }
}

create.addEventListener('click', () => {
//Adds a click event listener to the "New Game" button. When the button is clicked, 
//the function inside the curly braces is executed.
    socket.send(JSON.stringify({
        'tag' : 'create',
        'clientId' : clientId
    }))
})

function makeMove(){
//This function adds a click event listener to each cell of the game board, 
//allowing the user to make a move.
    cells.forEach(cell=>{
        if(!cell.classList.contains('cross') && !cell.classList.contains('circle'))
        cell.addEventListener('click', cellClicked)
    })
}

function cellClicked(src){
//This function is called when the user clicks on a cell of the game board. 
//It adds the corresponding symbol to the cell and sends the updated game board 
//to the server.
    let icon
    if(symbol=='x')
    icon = 'cross'
    else icon = 'circle'
    src.target.classList.add(icon)

    const board = []
    for(i=0; i<9 ; i++){
        if (cells[i].classList.contains('cross'))
        board[i] = 'x'
        else if (cells[i].classList.contains('circle'))
        board[i] = 'o'
        else
        board[i] = '' 
    }
    cells.forEach(cell=>{
        cell.removeEventListener('click', cellClicked)
    })
    socket.send(JSON.stringify({
        'tag': 'moveMade',
        'board' : board,
        'clientId' : clientId,
        'gameId' : gameId
    }))
}