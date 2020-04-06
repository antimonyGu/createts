"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WechatMiniProgramRuntime = void 0;

var _TouchItem = require("../components/TouchItem");

var _URLUtils = require("../utils/URLUtils");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * A IRuntime implementation for wechat mini program.
 *
 * **Things you need to know:**
 * 1. The default size of canvas in wechat mini program is 300x150, which is not the actual size,
 * you need to set the size and ratio by yourself
 * 1. the api to create offscreen canvas and image object is defined at Canvas class, you need to
 * pass a wx canvas to Runtime to make it work.
 * 1. Seems wechat mini program does not support bind event programmatically, you need to bind
 * event in <canvas> element, and call handleTouchEvent instead.
 *
 * Checkout the mini program demo here: https://developers.weixin.qq.com/s/eo87vimV7DgU
 */
var WechatMiniProgramRuntime = /*#__PURE__*/function () {
  function WechatMiniProgramRuntime() {
    _classCallCheck(this, WechatMiniProgramRuntime);

    this.wxCanvas = void 0;
    this.canvasCache = [];
  }

  _createClass(WechatMiniProgramRuntime, [{
    key: "setWxCanvas",
    value: function setWxCanvas(wxCanvas) {
      this.wxCanvas = wxCanvas;
    }
    /**
     * Returns an offscreen canvas object from cache if cache is not empty or creates a new one.
     */

  }, {
    key: "newCanvas",
    value: function newCanvas() {
      if (this.canvasCache.length > 0) {
        return this.canvasCache.shift();
      }

      return wx.createOffscreenCanvas();
    }
    /**
     * Release an offscreen canvas object, put it into cache.
     * @param canvas an offscreen canvas object to be released.
     */

  }, {
    key: "releaseCanvas",
    value: function releaseCanvas(canvas) {
      this.canvasCache.push(canvas);
    }
    /**
     * Create an image object.
     */

  }, {
    key: "newImage",
    value: function newImage() {
      return this.wxCanvas.createImage();
    }
    /**
     * Execute a load raw content task.
     * 1. If the source of content is a relative path, uses wechat file system api to read the file.
     * 1. If the source is an absolute url, use wechat network api to file a http request to get the
     * content, please note that you must whitelist the domain for your wechat mini program app.
     * @param task The load raw content task to be executed.
     */

  }, {
    key: "loadArrayBuffer",
    value: function loadArrayBuffer(task) {
      if (_URLUtils.URLUtils.isAbsolute(task.url)) {
        wx.request({
          url: task.url,
          method: task.method || 'GET',
          responseType: 'arraybuffer',
          success: function success(res) {
            task.onLoad(res.data);
          },
          fail: function fail(error) {
            task.onError(error);
          }
        });
      } else {
        wx.getFileSystemManager().readFile({
          filePath: task.url,
          success: function success(e) {
            task.onLoad(e.data);
          },
          fail: function fail(e) {
            task.onError(e);
          }
        });
      }
    }
    /**
     * Execute a load image task.
     * 1. If the source of image is a relative path, uses wechat file system api to read the file.
     * 1. If the source is an absolute url, use wechat network api to file a http request to get the
     * image, please note that you must whitelist the domain for your wechat mini program app.
     * @param task The load image task to be executed.
     */

  }, {
    key: "loadImage",
    value: function loadImage(task) {
      var _this = this;

      if (_URLUtils.URLUtils.isAbsolute(task.url)) {
        var downloader = wx.downloadFile({
          url: task.url,
          success: function success(res) {
            if (res.statusCode === 200) {
              var img = _this.newImage();

              img.src = res.tempFilePath;

              img.onload = function () {
                task.onLoad(img);
              };

              img.onerror = function (e) {
                task.onError(e);
              };
            } else {
              task.onError({
                msg: 'download failed, code:' + res.statusCode
              });
            }
          },
          fail: function fail(e) {
            task.onError(e);
          }
        });

        downloader.onProgressUpdate = function (event) {
          task.onProgress({
            loadedBytes: event.totalBytesWritten,
            totalBytes: event.totalBytesExpectedToWrite
          });
        };
      } else {
        var img = this.newImage();
        img.src = task.url;

        img.onload = function () {
          task.onLoad(img);
        };

        img.onerror = function (e) {
          task.onError(e);
        };
      }
    }
    /**
     * Add touch events for the Stage instance.
     * Seems wechat mini program does not support bind event programmatically, you need to bind event
     * in <canvas> element, and call handleTouchEvent instead, for example:
     *
     * in wxml file
     * ```html
     * <canvas type='2d'
     *         bindtouchstart='ontouchstart'
     *         bindtouchmove='ontouchmove'
     *         bindtouchend='ontouchend'
     *         bindtouchcancel='ontouchcancel'
     * ></canvas>
     * ```
     *
     * in js file
     * ```javascript
     *   ontouchstart: function(e) {
     *     createts.Runtime.get().handleTouchEvent('touchstart', this.data.stage, e);
     *   },
     *
     *   ontouchmove: function(e) {
     *     createts.Runtime.get().handleTouchEvent('touchmove', this.data.stage, e);
     *   },
     *
     *   ontouchend: function(e) {
     *     createts.Runtime.get().handleTouchEvent('touchend', this.data.stage, e);
     *   },
     *
     *   ontouchcancel: function(e) {
     *     createts.Runtime.get().handleTouchEvent('touchcancel', this.data.stage, e);
     *   },
     * ```
     *
     * @param stage The target Stage instance to be added event handlers.
     */

  }, {
    key: "enableEvents",
    value: function enableEvents(stage) {
      return;
    }
    /**
     * Calls wechat global requestAnimationFrame api to request a callback at next animation time.
     * @param listener The callback function.
     */

  }, {
    key: "requestAnimationFrame",
    value: function requestAnimationFrame(listener) {
      this.wxCanvas.requestAnimationFrame(listener);
    }
    /**
     * Handles touch event, translate the coordinates of multiple touches to stage space and send to
     * stage instance.
     * @param type Type of the touch event.
     * @param stage The stage to receive this event.
     * @param e The native touch event.
     */

  }, {
    key: "handleTouchEvent",
    value: function handleTouchEvent(type, stage, e) {
      var scaleX = stage.canvas.clientWidth ? stage.canvas.width / stage.canvas.clientWidth : 1;
      var scaleY = stage.canvas.clientHeight ? stage.canvas.height / stage.canvas.clientHeight : 1;
      var touches = [];
      var now = Date.now();
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = e.touches[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var touch = _step.value;
          touches.push(new _TouchItem.TouchItem(touch.identifier, stage, touch.x * scaleX, touch.y * scaleY, now));
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      stage.handleMouseOrTouchEvent(type, touches, e);
    }
  }]);

  return WechatMiniProgramRuntime;
}();

exports.WechatMiniProgramRuntime = WechatMiniProgramRuntime;