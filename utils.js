module.exports = (function() {
  function setLogger(logger) {
    logger.debug || (logger.debug = logger.info);
    utils.logger = utils.log = logger;
  }
  var utils, defaultLogger = console, emptyfunc = function() {}, slientLogger = {
    log: emptyfunc,
    error: emptyfunc,
    warn: emptyfunc,
    info: emptyfunc,
    debug: emptyfunc,
    trace: emptyfunc
  };
  utils = {
    slientLogger: slientLogger,
    setLogger: setLogger,
    mergeArray: function(target, source) {
      if (source.length < 5e4) target.push.apply(target, source); else for (var i = 0, len = source.length; i < len; i += 1) target.push(source[i]);
    },
    setDebugMode: function(on) {
      setLogger(on ? defaultLogger : slientLogger);
    },
    now: Date.now || function() {
      return new Date().getTime();
    },
    bind: function(fn, thisArg) {
      return fn.bind ? fn.bind(thisArg) : function() {
        return fn.apply(thisArg, arguments);
      };
    },
    domReady: function(callback) {
      /complete|loaded|interactive/.test(document.readyState) ? callback() : document.addEventListener("DOMContentLoaded", function() {
        callback();
      }, !1);
    },
    forEach: function(array, callback, thisArg) {
      if (array.forEach) return array.forEach(callback, thisArg);
      for (var i = 0, len = array.length; i < len; i++) callback.call(thisArg, array[i], i);
    },
    keys: function(obj) {
      if (Object.keys) return Object.keys(obj);
      var keys = [];
      for (var k in obj) obj.hasOwnProperty(k) && keys.push(k);
      return keys;
    },
    map: function(array, callback, thisArg) {
      if (array.map) return array.map(callback, thisArg);
      for (var newArr = [], i = 0, len = array.length; i < len; i++) newArr[i] = callback.call(thisArg, array[i], i);
      return newArr;
    },
    merge: function(array1, array2) {
      if (array2.length < 5e4) Array.prototype.push.apply(array1, array2); else for (var ii = 0, iilen = array2.length; ii < iilen; ii += 1) array1.push(array2[ii]);
    },
    arrayIndexOf: function(array, searchElement, fromIndex) {
      if (array.indexOf) return array.indexOf(searchElement, fromIndex);
      var k, o = array, len = o.length >>> 0;
      if (0 === len) return -1;
      var n = 0 | fromIndex;
      if (n >= len) return -1;
      k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
      for (;k < len; ) {
        if (k in o && o[k] === searchElement) return k;
        k++;
      }
      return -1;
    },
    extend: function(dst) {
      dst || (dst = {});
      return utils.extendObjs(dst, Array.prototype.slice.call(arguments, 1));
    },
    nestExtendObjs: function(dst, objs) {
      dst || (dst = {});
      for (var i = 0, len = objs.length; i < len; i++) {
        var source = objs[i];
        if (source) for (var prop in source) source.hasOwnProperty(prop) && (utils.isObject(dst[prop]) && utils.isObject(source[prop]) ? dst[prop] = utils.nestExtendObjs({}, [ dst[prop], source[prop] ]) : dst[prop] = source[prop]);
      }
      return dst;
    },
    extendObjs: function(dst, objs) {
      dst || (dst = {});
      for (var i = 0, len = objs.length; i < len; i++) {
        var source = objs[i];
        if (source) for (var prop in source) source.hasOwnProperty(prop) && (dst[prop] = source[prop]);
      }
      return dst;
    },
    subset: function(props) {
      var sobj = {};
      if (!props || !props.length) return sobj;
      this.isArray(props) || (props = [ props ]);
      utils.forEach(Array.prototype.slice.call(arguments, 1), function(source) {
        if (source) for (var i = 0, len = props.length; i < len; i++) source.hasOwnProperty(props[i]) && (sobj[props[i]] = source[props[i]]);
      });
      return sobj;
    },
    isArray: function(obj) {
      return Array.isArray ? Array.isArray(obj) : "[object Array]" === Object.prototype.toString.call(obj);
    },
    isObject: function(obj) {
      return "[object Object]" === Object.prototype.toString.call(obj);
    },
    isFunction: function(obj) {
      return "[object Function]" === Object.prototype.toString.call(obj);
    },
    isNumber: function(obj) {
      return "[object Number]" === Object.prototype.toString.call(obj);
    },
    isString: function(obj) {
      return "[object String]" === Object.prototype.toString.call(obj);
    },
    isHTMLElement: function(n) {
      return window["HTMLElement"] || window["Element"] ? n instanceof (window["HTMLElement"] || window["Element"]) : n && "object" == typeof n && 1 === n.nodeType && "string" == typeof n.nodeName;
    },
    isSVGElement: function(n) {
      return window["SVGElement"] && n instanceof window["SVGElement"];
    },
    isDefined: function(v) {
      return "undefined" != typeof v;
    },
    random: function(length) {
      var str = "", chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz", clen = chars.length;
      length || (length = 6);
      for (var i = 0; i < length; i++) str += chars.charAt(this.randomInt(0, clen - 1));
      return str;
    },
    randomInt: function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    inherit: function(child, parent) {
      function Ctor() {
        this.constructor = child;
      }
      for (var key in parent) parent.hasOwnProperty(key) && (child[key] = parent[key]);
      Ctor.prototype = parent.prototype;
      child.prototype = new Ctor();
      child.__super__ = parent.prototype;
      return child;
    },
    trim: function(s) {
      return s ? s.trim ? s.trim() : s.replace(/^\s+|\s+$/gm, "") : "";
    },
    trigger: function(el, evt, detail) {
      if (el) {
        detail = detail || {};
        var e, opt = {
          bubbles: !0,
          cancelable: !0,
          detail: detail
        };
        if ("undefined" != typeof CustomEvent) {
          e = new CustomEvent(evt, opt);
          el.dispatchEvent(e);
        } else try {
          e = document.createEvent("CustomEvent");
          e.initCustomEvent(evt, !0, !0, detail);
          el.dispatchEvent(e);
        } catch (exp) {
          this.log.error(exp);
        }
        return !0;
      }
      this.log.error("emply element passed in");
    },
    nextTick: function(f) {
      ("object" == typeof process && process.nextTick ? process.nextTick : function(task) {
        setTimeout(task, 0);
      })(f);
    },
    removeFromArray: function(arr, val) {
      var index = arr.indexOf(val);
      index > -1 && arr.splice(index, 1);
      return index;
    },
    debounce: function(func, wait, immediate) {
      var timeout, args, context, timestamp, result, later = function() {
        var last = utils.now() - timestamp;
        if (last < wait && last >= 0) timeout = setTimeout(later, wait - last); else {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
            timeout || (context = args = null);
          }
        }
      };
      return function() {
        context = this;
        args = arguments;
        timestamp = utils.now();
        var callNow = immediate && !timeout;
        timeout || (timeout = setTimeout(later, wait));
        if (callNow) {
          result = func.apply(context, args);
          context = args = null;
        }
        return result;
      };
    },
    throttle: function(func, wait, options) {
      var context, args, result, timeout = null, previous = 0;
      options || (options = {});
      var later = function() {
        previous = options.leading === !1 ? 0 : utils.now();
        timeout = null;
        result = func.apply(context, args);
        timeout || (context = args = null);
      };
      return function() {
        var now = utils.now();
        previous || options.leading !== !1 || (previous = now);
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          previous = now;
          result = func.apply(context, args);
          timeout || (context = args = null);
        } else timeout || options.trailing === !1 || (timeout = setTimeout(later, remaining));
        return result;
      };
    },
    ucfirst: function(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    },
    escapeHtml: function(text) {
      var map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;"
      };
      return (text + "").replace(/[&<>"']/g, function(m) {
        return map[m];
      });
    }
  };
  utils.setDebugMode(!1);
  return utils;
})()

