/**
*  Created on 2018-03-01 服务端
*/
const express = require('express');
const app = express(); //创建express实例,赋值给app
const fs = require('fs'); //node文件读取模块,用于读取文件
const path = require('path'); //node 路径处理模块,可以格式化路径
//socket 监听模块
const server = require('http').Server(app);
const io = require('socket.io')(server);

//mongodb
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/DATABASE_CHATROOM";

const users = []; //用来保存所有用户信息
const onlineUsers = []; //当前在线人数，mongodb 改版
let usersNum = 0; //统计在线人数

//连接数据库
MongoClient.connect(url, function(err, db) {
	if(err) throw err;
	console.log('数据库已创建');
	db.close();
});


//chat.html 报socket.io.js 404,将app.listen => server.listen
server.listen(3000, ()=> {
	console.log('server running at port 3000');
});

/**
* app.get() -- express中间件
*/
app.get('/', (req, res) => {
	res.redirect('/chat.html'); //重定向
})

// app.get('/chat.html', (req, res) => {
// 	//readFile 传入的是文件路径和回调函数，path.join()格式化了路径
// 	//__dirname 绝对路径
// 	fs.readFile(path.join(__dirname, './public/chat.html'), function(err, data){
// 		if(err) {
// 			console.error('读取chat.html发生错误', err);
// 			res.send('4 0 4')
// 		} else {
// 			res.end(data);
// 		}
// 	})
// })

/*
* 托管静态资源,这里托管了public文件中的静态资源
* localhost:3000/xxx/aaa
* 就能访问到public下的文件
*/

app.use('/', express.static(path.join(__dirname, './public')));

/**
* socket
* connection 事件名
*/
io.on('connection', (socket) => { //监听客户端的连接事件

	socket.on('login', (data) => {
		/*if(checkUserName(data)) {
			socket.emit('loginResult', {code: 1});//code=1代表用户已登录
		} else {
			//将该用户信息存进数组
			users.push({
				username: data.username,
				message: []
			});
			socket.emit('loginResult', {code: 0}); //code=0代表登录成功
			usersNum = users.length;
			console.log(`用户${data.username}登录成功，进入聊天室。当前登录人数${usersNum}`);
		}*/
		checkUser(data, socket);
	});

	//断开连接后做的事情
	socket.on('disconnect', () => { //该事件系统自动调用
		// usersNum = users.length;
		usersNum = onlineUsers.length;
		console.log(`当前在线登录人数：${usersNum}`);
	});

	/*监听sendMessage 得到msg并保存*/
	socket.on('sendMessage', (data) => {
		for(let _user of onlineUsers) { //remove users-- don't need
			if(_user.username === data.username) {
				_user.message.push(data.message);
				//信息存储后触发receiveMessage将信息发给所有浏览器--广播事件
				io.emit('receiveMessage', data);
				break;
			}
		}
	});
});

//校验用户是否已经登录
const checkUserName = (data) => {
	let isExist = false;
	users.map((user) => {
		if(user.username === data.username){
			isExist = true;
		}
	});

	return isExist;
}

/**************添加mongodb 改版****************/

//添加在线人数
const addOnlineUser = (data) => {
	onlineUsers.push({
		username: data.username,
		message: []
	});
	usersNum = onlineUsers.length;
	console.log(`用户${data.username}登录成功，进入聊天室。当前登录人数${usersNum}`);
}

/**
* 数据库操作--异步
* 用promise简单封装下
* 异步封装数据库连接，打开集合userlist
*/
const connectDB = () => {
	return new Promise((resolve, reject) => {
		MongoClient.connect(url, function(err, db) {
			if(err) {
				reject(err);
			}
			const dbo = db.db("DATABASE_CHATROOM");
			const collection = dbo.collection("userlist");
			resolve({
				db: db,
				collection: collection
			});
		});
	});
}

//异步封装检测用户名是否已经注册
const isRegister = (dbObj, name) => {
	return new Promise((resolve, reject) => {
		dbObj.collection.find({username:name}).toArray(function(err, result) {
			if(err) {
				reject(err);
			}
			resolve(Object.assign(dbObj, {result: result}));
		});
	});
}

//异步封装注册新增用户
const addUser = (dbObj, userData) => {
	return new Promise((resolve, reject) => {
		const myobj = userData;
		dbObj.collection.insertOne(myobj, function(err, result) {
			if(err) {
				reject(err);
			}

			resolve(Object.assign(dbObj, result));
			dbObj.db.close();
		})
	})
}

//校验逻辑
//1. 用户是否已经登录，是则返回code=3
const isLogin = (data) => {
	let flag = false;
	onlineUsers.map((user) => {
		if(user.username === data.username){
			flag = true;
		}
	});
	return flag;
}

//2.用户是否已经注册，是则校验密码是否正确，正确返回code=0 错误返回code=1 未注册返回code=2
const checkUser = (data, socket) => {
	connectDB().then(dbObj => {
		return isRegister(dbObj, data.username);
	}).then(dbObj => {
		const userData = dbObj.result || [];
		if(userData.length > 0){
			if(userData[0].password === data.password){
				if(isLogin(data)){
					socket.emit('loginResult', {code: 3});
				}else{
					addOnlineUser(data);
					socket.emit('loginResult', {code: 0});
				}
			}else {
				socket.emit('loginResult', {code: 1});
			}
			dbObj.db.close();
		}else{
			addUser(dbObj, data).then(resolve => { //往数据库插入
				addOnlineUser(data);
				socket.emit('loginResult', {code: '2-0'});
			}, reject => {
				socket.emit('loginResult', {code: '2-1'});
			});
		}
	})
}


