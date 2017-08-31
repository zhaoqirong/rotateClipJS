/**
 * @alia cropImage
 * Created by qrzhao on 2017/2/27.
 */
;
(function (){
	var CropImage = function(options){
		//options中需要的参数为：imgWidth,imgHeight,imgSrc,defaultAreaWidth,rotateModel,mountedTo,confirmCallback,cancelCallback
		this.imgWidth = options.imgWidth;
		this.imgHeight = options.imgHeight;
		if(this.imgWidth && this.imgHeight){
			this.proportion = (this.imgWidth / this.imgHeight).toFixed(2);
		}else{
			this.proportion = undefined;
		}
		this.defaultAreaSize= parseInt(options.defaultAreaSize) || 500;
		//用来控制图片旋转的方式
		this.rotateModel = options.rotateModel || 'common';
		//控制最外层的裁剪区域div应该挂载在哪个元素上
		this.mountedTo = options.mountedTo || document.body;
		//创建一个canvas，用来展示需要裁剪的图片
		this.canvas = document.createElement("canvas");
		this.context = this.canvas.getContext("2d");

		//创建一个裁剪容器区域，包容canvas画布，获取div的定位信息
		this.cropArea = document.createElement("div");
		this.cropArea.id = "cropArea";

		//创建一个裁剪框
		this.cropBox = document.createElement("div");
		this.cropBox.id = "cropBox";

		this.dragLeftTop = document.createElement("div"); //创建左上角的拉伸点
		this.dragLeftTop.id = 'dragLeftTop';
		this.dragLeftMiddle = document.createElement("div"); //创建左边线上的中间的拉伸点
		this.dragLeftMiddle.id = 'dragLeftMiddle';
		this.dragLeftBottom = document.createElement("div"); //创建左下角的拉伸点
		this.dragLeftBottom.id = 'dragLeftBottom';
		this.dragMiddleTop = document.createElement("div"); //创建上中的拉伸点
		this.dragMiddleTop.id = 'dragMiddleTop';
		this.dragMiddleBottom = document.createElement("div"); //创建下中的拉伸点
		this.dragMiddleBottom.id = 'dragMiddleBottom';
		this.dragRightTop = document.createElement("div"); //创建右上的拉伸点
		this.dragRightTop.id = 'dragRightTop';
		this.dragRightMiddle = document.createElement("div"); //创建右中的拉伸点
		this.dragRightMiddle.id = 'dragRightMiddle';
		this.dragRightBottom = document.createElement("div"); //创建右下的拉伸点
		this.dragRightBottom.id = 'dragRightBottom';

		//创建一个div用来展示拉伸后的裁剪框大小
		this.sizeDiv = document.createElement("div");
		//创建一个确认按钮和取消按钮的div;
		this.btnContainer = document.createElement("div"); //此div用来包裹确认和取消的div
		this.btnConfirm = document.createElement("div");
		this.btnConfirm.id='confirm';
		this.btnConfirm.innerHTML = '确定';
		this.btnCancel = document.createElement("div");
		this.btnCancel.innerHTML = '取消';
		this.btnCancel.id = 'cancel';

		this.imgDom = document.createElement("img");
		if(options.imgSrc.substring(0,4).toLowerCase()==='http'){
			this.imgDom.crossOrigion = 'anonymous';
		}
		this.imgDom.onload = this.init.bind(this);
		this.imgDom.src=options.imgSrc;
		// 定义按下鼠标时产生的变量
		this.mouseStartX = null;
		this.mouseStartY = null;
		this.dragLeft = null;
		this.dragTop = null;
		this.dragWidth = null;
		this.dragHeight = null;
		this.dragMaxH = null;
		this.dragMaxW = null;
		this.mouseTarget = null; //鼠标点击时，记录当前点击的对象
		//初始化方法
		this.drag = this.drag.bind(this);
		this.clearDragEvent = this.clearDragEvent.bind(this);
		this.confirmCallback = options.confirmCallback;
		this.cancelCallback = options.cancelCallback;
	};
	CropImage.prototype = {
		init:function (){
			//设置canvas的宽高
			this.canvas.width = this.canvas.height = this.defaultAreaSize;
			var canvasParams = this.getCanvasParams();
			//计算裁剪框的宽高和位置,通过宽高比的大小来判断先改变宽度还是先改变高度，有利于平滑的拉伸裁剪框
			if(this.proportion && this.proportion > 1){  //宽比高大
				this.cropBox.style.width = this.defaultAreaSize / 2 + 'px';
				this.cropBox.style.height = parseInt((this.defaultAreaSize / 2) / this.proportion) +'px';
			}else if(this.proportion && this.proportion <= 1){ //宽比高小
				this.cropBox.style.width = parseInt((this.defaultAreaSize / 2) * this.proportion) + 'px';
				this.cropBox.style.height = this.defaultAreaSize / 2 + 'px';
			}else{
				this.cropBox.style.width = canvasParams.width / 2 +'px';
				this.cropBox.style.height = canvasParams.height / 2 +'px';
			}
			this.cropBox.style.top = canvasParams.positionY + 'px';
			this.cropBox.style.left = canvasParams.positionX + 'px';
			//先在canvas上画图
			this.context.drawImage(this.imgDom,canvasParams.positionX,canvasParams.positionY,canvasParams.width,canvasParams.height);
			//设置div的样式
			this.setStyle();

			this.btnContainer.appendChild(this.btnCancel);
			this.btnContainer.appendChild(this.btnConfirm);
			//把拉伸点和canvas添加到裁剪区域，并把裁剪区域添加到body中
			//如果存在规定的裁剪框比例，那么上下左右四个拉伸点则不使用
			if(!this.proportion){
				this.cropBox.appendChild(this.dragLeftMiddle);
				this.cropBox.appendChild(this.dragMiddleTop);
				this.cropBox.appendChild(this.dragMiddleBottom);
				this.cropBox.appendChild(this.dragRightMiddle);
			}
			this.cropBox.appendChild(this.dragLeftTop);
			this.cropBox.appendChild(this.dragLeftBottom);
			this.cropBox.appendChild(this.dragRightTop);
			this.cropBox.appendChild(this.dragRightBottom);
			this.cropBox.appendChild(this.sizeDiv);
			this.cropBox.appendChild(this.btnContainer);
			this.cropArea.appendChild(this.cropBox);
			this.cropArea.appendChild(this.canvas);
			this.mountedTo.appendChild(this.cropArea);

			this.addEvent(this.cropBox,'mousedown',this.startDrag.bind(this));

			this.showCropBoxSize();
		},
		rotateImage:function (angel){
			this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
			//记住初始坐标原点
			this.context.save();
			angel = angel ? (angel % 360) : 0;
			var rotation = Math.PI * angel / 180;
			var centerX = this.canvas.width / 2;
			var centerY = this.canvas.height / 2;
			this.context.translate(centerX,centerY);
			this.context.rotate(rotation);
			this.drawImage(angel);
			this.context.restore();
		},
		drawImage:function(angel){
			if(this.rotateModel === 'special'){
				var imgSize = this.getImgSize(angel);
                this.context.drawImage(this.imgDom,-imgSize.width / 2,-imgSize.height / 2,imgSize.width,imgSize.height);
			}else{
				var w = this.imgDom.width;
				var h = this.imgDom.height;
				var proportion = w / h;
				var imgHeight = Math.sqrt((this.canvas.width * this.canvas.width) / ((proportion * proportion) + 1));
				var imgWidth = imgHeight * proportion;
                this.context.drawImage(this.imgDom,-imgWidth / 2,-imgHeight / 2,imgWidth,imgHeight);
			}
		},
		confirm:function (){
			var self = this;
			try{
				var base64 = this.canvas.toDataURL();
				var img = document.createElement("img");
				img.onload = function (){
					var outputCanvas = document.createElement("canvas");
					var outputCtx = outputCanvas.getContext("2d");
					var x = self.cropBox.offsetLeft;
					var y = self.cropBox.offsetTop;
					var w = self.cropBox.offsetWidth;
					var h = self.cropBox.offsetHeight;
					outputCanvas.width = self.imgWidth || w;
					outputCanvas.height = self.imgHeight || h;
					outputCtx.drawImage(img,x,y,w,h,0,0,self.imgWidth || w,self.imgHeight || h);
					var outputBase64 = outputCanvas.toDataURL('image/jpeg');
					self.confirmCallback && self.confirmCallback(outputBase64,outputCanvas);
				};
				img.src = base64;
			}catch(e){
				alert(e);
			}
		},
		cancel:function (){
			this.mountedTo.removeChild(this.cropArea);
			this.cancelCallback && this.cancelCallback();
		},
		dragByProportion:function (e,directionX,directionY){
			if(this.proportion){
				var dragRight = this.cropArea.offsetWidth - this.dragLeft - this.dragWidth;
				var dragBottom = this.cropArea.offsetHeight - this.dragTop - this.dragHeight;
				var dragWidth1 = this.dragWidth + dragRight;
				var dragHeight1 = dragWidth1 / this.proportion;

				var dragWidth2 = this.dragWidth + this.dragLeft;
				var dragHeight2 = dragWidth2 / this.proportion;

				var flag = 'x'; //此标记代表，先上下变换，还是先左右变换，默认先左右变换
				if(directionX =='right'){
					if(dragHeight1 <= (dragBottom + this.dragHeight)){
						flag = 'x';
					}else{
						flag = 'y';
					}
				}else{
					if(dragHeight2 <= (this.dragHeight +this.dragTop)){
						flag = 'x';
					}else{
						flag = 'y';
					}
				}
				if(flag === 'x'){
					//如果当宽度最大，而且高度没有超出可以拉伸的最大宽度时，此时应该先变化宽度，再变化高度
					this.leftAndRightDrag(e,directionX);
					var height = this.cropBox.offsetWidth / this.proportion;
					//如果用户拉伸左上角或者右上角，会改变裁剪框的top，此时对top做单独处理
					if(directionY === 'up'){
						var bottomPosition = this.cropBox.offsetTop + this.cropBox.offsetHeight;
						var top = (bottomPosition - height) > this.cropArea.offsetHeight ? this.cropArea.offsetHeight : (bottomPosition - height);
						this.cropBox.style.top = top + 'px';
					}
					this.cropBox.style.height = height + 'px';
				}else{
					this.upAndDowDrag(e,directionY);
					var width = this.cropBox.offsetHeight * this.proportion;
					if(directionX === 'left'){
						var rightPosition = this.cropBox.offsetWidth + this.cropBox.offsetLeft;
						var left = (rightPosition - width) > this.cropArea.offsetWidth ? this.cropArea.offsetWidth : (rightPosition - width);
						this.cropBox.style.left = left + 'px';
					}
					this.cropBox.style.width = width + 'px';
				}
			}else{
				this.upAndDowDrag(e,directionY);
				this.leftAndRightDrag(e,directionX);
			}
			this.showCropBoxSize();
		},
		upAndDowDrag:function (event,direction){
			var e = event ? event:window.event;
			var clientY = e.clientY;
			var parentH = this.cropArea.offsetHeight;
			var changeY = clientY - this.mouseStartY;
			if(direction === 'up'){
				//如果changeY大于0，说明鼠标往下拉，否则往上拉
				if(changeY >= 0){
					if(changeY >= this.dragHeight){
						changeY = this.dragHeight;
					}
				}else{
					if(Math.abs(changeY) >= this.dragTop){
						changeY = -this.dragTop;
					}
				}
				this.cropBox.style.top = (this.dragTop + changeY) + 'px';
				this.cropBox.style.height = (this.dragHeight - changeY) + 'px';
			}else {
				//如果changeY大于0，说明鼠标往下拉，否则往上拉
				if(changeY >= 0){
					if(changeY >= (parentH - this.dragHeight - this.dragTop)){
						changeY = (parentH - this.dragHeight - this.dragTop);
					}
				}else{
					if(Math.abs(changeY) >= this.dragHeight){
						changeY = -this.dragHeight;
					}
				}
				this.cropBox.style.height = (this.dragHeight + changeY) + 'px';
			}
			this.showCropBoxSize();
		},
		leftAndRightDrag:function (event,direction){
			var e = event ? event:window.event;
			var clientX = e.clientX;
			var parentW = this.cropArea.offsetWidth;
			var changeX = clientX - this.mouseStartX;
			if(direction === 'left'){
				//如果changeX大于0，说明鼠标往右拉，否则往左拉
				if(changeX >= 0){
					if(changeX >= this.dragWidth){
						changeX = this.dragWidth;
					}
				}else{
					if(Math.abs(changeX) > this.dragLeft){
						changeX  = -this.dragLeft;
					}
				}
				this.cropBox.style.left = (this.dragLeft + changeX) + 'px';
				this.cropBox.style.width = (this.dragWidth - changeX) + 'px';
			}else{
				if(changeX >= 0){
					if(changeX >= (parentW - this.dragLeft - this.dragWidth)){
						changeX = (parentW - this.dragLeft - this.dragWidth);
					}
				}else{
					if(Math.abs(changeX) >= this.dragWidth){
						changeX = -this.dragWidth;
					}
				}
				this.cropBox.style.width = (this.dragWidth + changeX) + 'px';
			}
			this.showCropBoxSize();
		},
		startDrag:function (event){
			var e = event ? event : window.event; //兼容事件
			e.preventDefault(); //取消默认行为
			this.mouseTarget = e.target.id;
			if(this.mouseTarget === 'confirm'){
				this.confirm();
				return;
			}else if(this.mouseTarget === 'cancel'){
				this.cancel();
				return;
			}
			if(this.mouseTarget !== 'cropBox'){
				this.btnContainer.style.display = 'none';
			}
			var dragAreaW = this.cropArea.offsetWidth;
			var dragAreaH = this.cropArea.offsetHeight;
			this.mouseStartX = e.clientX;
			this.mouseStartY = e.clientY;
			this.dragLeft = this.cropBox.offsetLeft;
			this.dragTop = this.cropBox.offsetTop;
			this.dragWidth = this.cropBox.offsetWidth;
			this.dragHeight = this.cropBox.offsetHeight;
			this.dragMaxW = dragAreaW - this.cropBox.offsetWidth;
			this.dragMaxH = dragAreaH - this.cropBox.offsetHeight;
			this.addEvent(document,'mousemove',this.drag);
			this.addEvent(document,'mouseup',this.clearDragEvent);
		},
		drag: function (event){
			var e = event ? event : window.event;
			switch (this.mouseTarget) {
				case 'cropBox':
					this.dragMove(e);
					break;
				case 'dragMiddleTop':
					this.upAndDowDrag(e,'up');
					break;
				case 'dragMiddleBottom':
					this.upAndDowDrag(e,'down');
					break;
				case 'dragLeftMiddle':
					this.leftAndRightDrag(e,'left');
					break;
				case 'dragRightMiddle':
					this.leftAndRightDrag(e,'right');
					break;

				case 'dragLeftTop':
					this.dragByProportion(e,'left','up');
					break;
				case 'dragLeftBottom':
					this.dragByProportion(e,'left','down');
					break;
				case 'dragRightTop':
					this.dragByProportion(e,'right','up');
					break;
				case 'dragRightBottom':
					this.dragByProportion(e,'right','down');
					break;
				default:
					break;
			}
		},
		dragMove:function (event){
			var e = event ? event: window.event; //兼容事件
			window.getSelection().removeAllRanges();
			var moveX = e.clientX - this.mouseStartX; // 拖拽中 鼠标坐标变化值
			var moveY = e.clientY - this.mouseStartY; // 拖拽中 鼠标坐标变化值
			var destinationX = Math.min((moveX + this.dragLeft), this.dragMaxW); // 限制拖动的最大范围，避免超出右和下边界
			var destinationY = Math.min((moveY + this.dragTop), this.dragMaxH);  // 限制拖动的最大范围，避免超出右和下边界
			this.cropBox.style.left = destinationX < 0 ? 0 : destinationX + 'px'; // 限制最小范围，避免超出上和左边界
			this.cropBox.style.top = destinationY < 0 ? 0 : destinationY + 'px';  // 限制最小范围，避免超出上和左边界
		},
		getCanvasParams: function (){
			var positionX,positionY,width,height;
			//获取图片在canvas中的位置以及需要画出的宽高
			if(this.imgDom.width > this.imgDom.height){
				width = this.defaultAreaSize;
				height = parseInt(this.defaultAreaSize * (this.imgDom.height / this.imgDom.width));
				positionX = 0;
				positionY = (this.defaultAreaSize - height) / 2;
			}else {
				height = this.defaultAreaSize;
				width = parseInt(this.defaultAreaSize * (this.imgDom.width / this.imgDom.height));
				positionX = (this.defaultAreaSize - width) / 2;
				positionY = 0;
			}
			return {positionX:positionX,positionY:positionY,width:width,height:height}
		},
		showCropBoxSize: function (){
			this.sizeDiv.innerHTML = this.cropBox.offsetWidth + ' x ' + this.cropBox.offsetHeight;
		},
		getImgSize:function (angel){
			var self = this;
			var getLine = function (rad,changeRad) {
				var trueAngel  = null;
				if((rad + changeRad) > Math.PI * 2){
					trueAngel = rad + changeRad - Math.PI * 2
				}else{
					trueAngel = rad + changeRad;
				}
				var line = null;
				if(((Math.PI / 4) <= trueAngel && trueAngel <= (Math.PI * 3 / 4)) || ((Math.PI * 5 / 4) <= trueAngel && trueAngel <= (Math.PI * 7 / 4))){
					line = Math.abs(self.defaultAreaSize / Math.sin(trueAngel));
				}else{
					line = Math.abs(self.defaultAreaSize / Math.cos(trueAngel));
				}
				return line;
			};
			var width = this.imgDom.width;
			var height = this.imgDom.height;
			var slash = Math.sqrt(width * width + height * height);
			var rad = Math.PI * 2 - Math.asin(height / slash); //图片自身底线与对角线的角度的弧度值
			var restRad = Math.PI + Math.asin(height / slash);
			var changeRad = Math.PI * angel / 180;
			var line1 = getLine(rad,changeRad);
			var line2 = getLine(restRad,changeRad);
			line1 = (line1 > line2) ? line2 : line1;
			return {width : line1 * (width / slash) , height : line1 * (height / slash)};
		},
		clearDragEvent: function (){
			if(this.btnContainer.style.display === 'none'){
				this.btnContainer.style.display = 'inline-block';
			}
			this.removeEvent(document,'mousemove', this.drag);
			this.removeEvent(document,'mouseup', this.clearDragEvent);
		},
		addEvent:function (el,type,func){
			var isSupport = !!document.addEventListener;
			if(isSupport){
				el.addEventListener(type,func,false);
			}else{
				el.attachEvent('on'+type,func);
			}
		},
		removeEvent:function (el,type,func){
			var isSupport = !!document.addEventListener;
			if(isSupport){
				el.removeEventListener(type,func,false);
			}else{
				el.detachEvent('on' + type,func);
			}
		},
		setStyle: function (){
			this._css(this.cropArea, {
				position:'relative',
				display:'inline-block',
				width:this.defaultAreaSize + 'px',
				height:this.defaultAreaSize + 'px',
				// background:'white'
			});
			this._css(this.cropBox, {
				position:'absolute',
				backgroundColor:'rgba(255,255,255,0.5)',
				border:'1px dotted black',
				boxSizing:'border-box',
				cursor:'move'
			});
			this._css(this.sizeDiv, {
				position:'absolute',
				width:'75px',
				height:'22px',
				lineHeight:'22px',
				display:'inline-block',
				textAlign:'center',
				top:'-22px',
				left:'5px',
				backgroundColor:'rgba(0,0,0,1)',
				color:'white',
				fontSize:'12px'
			});
			this._css(this.btnContainer, {
				position:'absolute',
				display:'inline-block',
				width:'180px',
				height:'34px',
				bottom:'-38px',
				right:'0px'
			});
			this._css(this.btnConfirm, {
				display:'inline-block',
				width:'86px',
				height:'34px',
				lineHeight:'34px',
				marginRight:'2px',
				marginLeft:'2px',
				backgroundColor:'#16c417',
				color:'white',
				fontSize:'16px',
				textAlign:'center',
				cursor:'pointer'
			});
			this._css(this.btnCancel, {
				display:'inline-block',
				width:'86px',
				height:'34px',
				lineHeight:'34px',
				marginRight:'2px',
				marginLeft:'2px',
				backgroundColor:'#587bbf',
				color:'white',
				fontSize:'16px',
				textAlign:'center',
				cursor:'pointer'
			});
			this._css(this.dragLeftTop,{
				width: '6px',
				height: '6px',
				background: '#fff',
				border: '1px solid #888',
				position: 'absolute',
				opacity: '0.8',
				top: '-4px',
				left: '-4px',
				cursor: 'nw-resize'
			});
			this._css(this.dragLeftMiddle, {
				width: '6px',
				height: '6px',
				background: '#fff',
				border: '1px solid #888',
				position: 'absolute',
				opacity: '0.8',
				top: '50%',
				left: '-4px',
				marginTop: '-4px',
				cursor: 'w-resize'
			});
			this._css(this.dragLeftBottom, {
				width: '6px',
				height: '6px',
				background: '#fff',
				border: '1px solid #888',
				position: 'absolute',
				opacity: '0.8',
				bottom: '-4px',
				left: '-4px',
				cursor: 'sw-resize'
			});
			this._css(this.dragMiddleTop, {
				width: '6px',
				height: '6px',
				background: '#fff',
				border: '1px solid #888',
				position: 'absolute',
				opacity: '0.8',
				top: '-4px',
				left: '50%',
				cursor: 'n-resize'
			});
			this._css(this.dragMiddleBottom, {
				width: '6px',
				height: '6px',
				background: '#fff',
				border: '1px solid #888',
				position: 'absolute',
				opacity: '0.8',
				bottom: '-4px',
				left: '50%',
				cursor: 's-resize'
			});
			this._css(this.dragRightTop, {
				width: '6px',
				height: '6px',
				background: '#fff',
				border: '1px solid #888',
				position: 'absolute',
				opacity: '0.8',
				top: '-4px',
				right: '-4px',
				cursor: 'ne-resize'
			});
			this._css(this.dragRightMiddle, {
				width: '6px',
				height: '6px',
				background: '#fff',
				border: '1px solid #888',
				position: 'absolute',
				opacity: '0.8',
				top: '50%',
				right: '-4px',
				marginTop: '-4px',
				cursor: 'e-resize'
			});
			this._css(this.dragRightBottom, {
				width: '6px',
				height: '6px',
				background: '#fff',
				border: '1px solid #888',
				position: 'absolute',
				opacity: '0.8',
				bottom: '-4px',
				right: '-4px',
				cursor: 'se-resize'
			});
		},
		_css: function (el, obj) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					el.style[key] = obj[key];
				}
			}
		}
	};
	if (typeof module !== 'undefined' && typeof exports === 'object') {
		module.exports = CropImage;
	}else {
		window.CropImage = CropImage;
	}
})();