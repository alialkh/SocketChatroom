//TODO: make stuff stick on bottom
//TODO: colors and names update  online users section for all users when someone updates their stuff
//TODO: Cookies
//TODO: graphical improvements



var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});


// Array of user objects
var currentUsers = [];
var chatLog = [];

// we have one of these for every new connection
io.on('connection', function(socket) {

    let cookiesRead = true;

    socket.emit('got cookies');

    // if they have a cookie and they're initializing
    socket.on('cookies response', function(user, color)
    {
        console.log("I got for cookie info: ",user,color);
        // if theyre null, we didnt read any cookies, otherwise push a new user
        if (user === null && color === null)
            newUser();
        else {
            currentUsers.push(
                {
                    Name: user,
                    Color: color,
                    Socket: socket
                }
            );

            console.log("User:",user,".    Color:",color,".");

            socket.emit('initialization', user, color, chatLog, generateNameColorArray());
            socket.broadcast.emit("new user", user, color);
        }
    });
    function newUser(){

        console.log("Making new User!");
        // Will contain the format [name, color]
        let newUser = generateUser(socket);

        // initialization emits a name and standard color
        socket.emit('initialization', newUser[0], newUser[1], chatLog, generateNameColorArray());

        // Emit to everyone but the new user, telling them someone joined
        socket.broadcast.emit("new user", newUser[0], newUser[1]);
    }

    // On a disconnect
    socket.on('disconnect', function () {
        console.log("Disconnecter :  ",socket.id);
        console.log("Current Users on Disconnect", currentUsers);
        let indexToRemove = findIndexGivenSocket(socket.id);

        if (indexToRemove !== -1) {
            let removedUser = currentUsers.splice(indexToRemove, 1);
            console.log(removedUser);
            console.log("REMOVED THE GUY", removedUser[0].Name);
            // Acknowledge to everyone
            io.emit('disconnected', removedUser[0].Name)
        }
        else
            console.log("FAILED TO FIND USER WHO DISCONNECTED!! \n\n")
    });

    // when a message request is received
    socket.on('chat message', function (user,msg) {

        let handshake = socket.handshake; // handshake to find time

        io.emit('chat message', handshake.time, user, findColor(user), msg);
    });

    // When a message is sent
    socket.on('sent message', function(msg)
    {
        chatLog.push(msg);
    });


    // Change name request
    socket.on('change name', function(oldName,newName)
    {
        if (findIndexGivenName(newName) === -1)
        {
            currentUsers[findIndexGivenName(oldName)].Name = newName;
            socket.emit('successNameChange');
            io.emit('name change acknowledge', newName, oldName)
        }
        else
        {
            socket.emit('failedNameChange')
        }

    });

    socket.on('change color', function(user, newColor)
    {
        setColor(user, newColor);
        io.emit('color change acknowledge', user, newColor);
    })

});

const generateUser = function(socket)
{
    let i = 1;
    while (true)
    {
        // check if the array already has the name
        let found=false;
        for(let j = 0; j < currentUsers.length; j++) {
            if (currentUsers[j].Name === 'User' + i) {
                found = true;
            }
        }
        // if you havent found it in the array, add it in
        if (found===false)
        {
            color=generateRandomColor();
            // create the user object
            currentUsers.push(
                {
                    Name: 'User' + i,
                    Color: color,
                    Socket: socket
                }
            );
            return ['User' + i,color];
        }

        i++;
    }
};

// Adapted from https://stackoverflow.com/questions/1484506/random-color-generator
function generateRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

const findColor = function(user) {
    // console.log("Current Users on findColor: ", currentUsers);
    for (let j = 0; j < currentUsers.length; j++) {
        if (currentUsers[j].Name === user) {
            return currentUsers[j].Color
        }
    }
};

const setColor = function(user,color)
{
    for(let j = 0; j < currentUsers.length; j++) {
        if (currentUsers[j].Name === user) {
            currentUsers[j].Color = color;
        }
    }
    console.log("Updated Current Users Array: ",currentUsers);
};



function generateNameColorArray()
{
    let outArray = [];
    for(let j = 0; j < currentUsers.length; j++) {
        outArray.push({
            Name: currentUsers[j].Name,
            Color: currentUsers[j].Color
        });
    }
    return outArray;
}

/**
 * Finds the index of the user object given the name
 *
 * @param name Name of the user you want to find the index for
 * @returns {number} -1 if not found, otherwise the index of the name
 */
const findIndexGivenName = function(name)
{
    console.log("Name I was passed: ",name);
    let indexOfName=-1;
    currentUsers.forEach(function(value,index)
    {
        if(value.Name===name)
        {
            indexOfName= index;
        }
    });
    return indexOfName
};

const findIndexGivenSocket = function(socketID)
{
    let indexOfSocket=-1;
    for(let j = 0; j < currentUsers.length; j++) {
        if (currentUsers[j].Socket.id === socketID) {
            indexOfSocket = j;
        }
    }
    console.log("index I decided on",indexOfSocket);
    return indexOfSocket
};

// emit is what we use for communication between one user and server and vice versa.