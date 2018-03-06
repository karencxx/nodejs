/**
* main.js 客户端
* created on 2018-03-01
*/
$(function(){
	const url = 'http://127.0.0.1:3000'
	let _username = '';
	let _$inputname = $('#name'); //登录框
	let _$loginButton = $('#loginbutton'); //登录按钮
	let _$chattextarea = $('#chatmessage'); //聊天输入框

	let socket = io.connect(url);

	//设置用户名 当用户登录时触发
	let setUsername = () => {
		_username = _$inputname.val().trim();

		//判断用户名是否存在,如果存在就触发登录
		if(_username){
			socket.emit('login', {username: _username});
		}else{
			alert('请输入用户名');
		}
	};

	/*前端事件*/
	_$loginButton.on('click', function(event) {
		setUsername();
	});

	_$inputname.on('keyup', function(e) {
		if(e.keyCode === 13) {
			setUsername();
		}
	});

	/*socket.io部分逻辑*/
	socket.on('loginResult', (data) => {
		if(data.code === 0){
			//登陆成功
			showChatRoom();
		}else if(data.code === 1){
			alert('用户已登录');
		}else{
			alert('登录失败');
		}
	});

	let showChatRoom = () => {
		/*隐藏登录框，取消绑定事件。*/
		$('#loginbox').hide('slow');
		_$loginButton.off('click');

		/*显示聊天界面*/
		$(`<div class="title">欢迎${_username}来到聊天室</div>`).insertBefore($('#content'));
		$('#chatbox').show('slow');
	};

	let sendMessage = () => {
		/*得到聊天信息，不为空就将信息和用户名发送过去*/
		let _message = _$chattextarea.val();

		if(_message) {
			socket.emit('sendMessage', {username: _username, message: _message});
		}else {
			alert('请输入发送信息');
		}
	};

	/*聊天事件*/
	_$chattextarea.on('keyup', function(event) {
		if(event.keyCode === 13) {
			sendMessage();
			_$chattextarea.val('');
		}
	});

	let showMessage = (data) => {
		/*先判断这个消息是不是自己发出的，然后以不同样式显示*/
		if(data.username === _username) {
			$('#content').append(`<p class='self-message'><span class='msg'>${data.message}</span><span class='name'> ${data.username}</span></p>`);
		}else {
			$('#content').append(`<p class='other-message'><span class='name'>${data.username}</span><span class='msg'>${data.message}</span></p>`);
		}
	};

	socket.on('receiveMessage', (data) => {
		/*监听服务器广播的消息*/
		showMessage(data);
	})
})
