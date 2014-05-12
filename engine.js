var Engine, Renderer, Geometry;

(function($) {

  var makeRenderer = function(canvas) {
    var canvas = $(canvas).get(0);
    var ctx = canvas.getContext("2d");
    var engine;
    var view;
    var width, height;

    var that = {
      init : function (system, newWidth, newHeight) {
        engine = system;
        that.initMouseHandling();
        
        if (newWidth !== undefined && newHeight !== undefined) {
          width = newWidth;
          height = newHeight;
        } else {
          width = canvas.width;
          height = canvas.height;
        }
        
        engine.screenSize(width, height);
        view = Geometry.makeViewPoint([0,0,0], [1,0,0], 0, canvas.width, canvas.height);
        
        engine.setView(view);
      },
      
      redraw : function () {
        var id, d, i;
        
        engine.eachPixel(function(object, x, y) {
          if (x === 0) {
            id = ctx.createImageData(canvas.width, 1);
            d  = id.data;
            i = 0;
          } else if (x === canvas.width - 1) {
            ctx.putImageData(id, 0, y);
          }
          
          if (object === null) { // No object
            d[i]     = 255;
            d[i + 1] = 255;
            d[i + 2] = 255;
            d[i + 3] = 255;
          } else if (object === 'square') { // For a square
            d[i]     = 255;
            d[i + 1] = ((y % 2 === 0) ? 254 : 0 );
            d[i + 2] = 0;
            d[i + 3] = 255;
          }
          i += 4;
          
        });
        
        $('#fps').text(engine.getFrameRate());
      },
      
      initMouseHandling: function () {
        console.log('renderer.initMouseHandling()');
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          clicked:function(e) {
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
            dragged = engine.nearest(_mouseP);

            /*if (dragged.node.name === 'a') {
              _mouseP = null;
              dragged = null;
              return
            }*/

            if (dragged && dragged.node !== null) {
              // while we're dragging, don't let physics move the node
              dragged.node.fixed = true;
            }

            $(canvas).bind('mousemove', handler.dragged);
            $(window).bind('mouseup', handler.dropped);

            return false;
          },
          dragged:function(e) {
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);

            if (dragged && dragged.node !== null) {
              var p = engine.fromScreen(s);
              dragged.node.p = p;
            }

            return false;
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return;
            if (dragged.node !== null) dragged.node.fixed = false;
            dragged.node.tempMass = 1000;
            dragged = null;
            $(canvas).unbind('mousemove', handler.dragged);
            $(window).unbind('mouseup', handler.dropped);
            _mouseP = null;
            return false;
          }
        }
        
        // start listening
        $(canvas).mousedown(handler.clicked);

      },
    }
    return that;
  };
  
  var makeEngine = function () {
    var renderer;
    var width, height;
    var go = true;
    var timestep = 10; // ms, to start with
    var lastFrameCount = 0;
    var frameCount = 0;
    var TheLoopIsScheduled = false;
    var data;
    var view;
    
    function countFrames() {
      lastFrameCount = frameCount;
      frameCount = 0;
      setTimeout(countFrames, 1000);
    }
    
    // The main loop
    function TheLoop() {
      TheLoopIsScheduled = false;
      frameCount++;
      
      //start timer
      
      step();
      renderer.redraw();
      
      //end timer
      //set time step appropriately
      
      if (go) scheduleTheLoop();
    }
    
    function scheduleTheLoop() {
      if (!TheLoopIsScheduled) {
        TheLoopIsScheduled = true;
        setTimeout(TheLoop, timestep);
      }
    }
    
    // Step the world by timestep ms
    function step() {
    };
    
    function findObject(x, y) {
      for (var o in data) {
        if (Geometry.isPointInsideShape(data[o], {x : x, y : y})) {
          return data[o].type;
        }
      }
      return null;
    };
    
    var that = {
      setRenderer : function (newRenderer) {
        console.log('engine.setRenderer()');
        
        renderer = newRenderer;
        renderer.init(that);
        
        scheduleTheLoop();
        countFrames();
        
      },
      screenSize : function (newWidth, newHeight) {
        console.log('engine.screenSize()');
        width = newWidth;
        height = newHeight;
      },
      eachPixel : function (handler) {
        for (var y = 0; y < height; y++) {
          for (var x = 0; x < width; x++) {
            handler(findObject(x, y), x, y);
          }
        }
      },
      resume : function () {
        console.log('engine.resume()');
        go = true;
        scheduleTheLoop();
      },
      pause : function () {
        console.log('engine.pause()');
        go = false;
      },
      tick : function () {
        console.log('engine.tick()');
        scheduleTheLoop();
      },
      getFrameRate : function () {
        return lastFrameCount;
      },
      setData : function (newData) {
        console.log('engine.setData()');
        data = newData;
      },
      setView : function (newView) {
        console.log('engine.setView()');
        view = newView;
      },
    };
    
    return that;
  };
  
  Geometry = {
    makeShape : function(type) {
      var shape = {};
      shape.type = type;
      
      if (type === 'square') { // makeShape('square', left, top, bottom, right)
        shape.left = arguments[1];
        shape.top = arguments[2];
        shape.bottom = arguments[3];
        shape.right = arguments[4];
      } else if (type === 'line') {
        shape.start = arguments[1];
        shape.finish = arguments[2];
        shape.width = arguments[3];
      }
      
      return shape;
    },
    isPointInsideShape : function(shape, pt) {
      if (shape.type === 'square2d') {
        return pt.x >= shape.left && pt.x < shape.right && pt.y >= shape.top && pt.y < shape.bottom;
      } else if (shape.type === 'rect') {
        return false;
      } else if (shape.type === 'line') {
        return false;
      } else {
        console.log('Unknown shape');
      }
    },
    isLineIntersectingShape : function(shape, line) {
      if (shape.type === 'square2d') {
        return pt.x >= shape.left && pt.x < shape.right && pt.y >= shape.top && pt.y < shape.bottom;
      } else if (shape.type === 'rect') {
        return false;
      } else if (shape.type === 'line') {
        return false;
      } else {
        console.log('Unknown shape');
      }
    },
    makeViewPoint : function (position, direction, convexity, width, height) {
      var view = {};
      
      view.pos = position;
      if (convexity === 0) { // flat plane of rays
        view.rays = [];
        for (var y = -height/2; y <= height/2; y++) {
          view.rays[y] = [];
          for (var x = -width/2; x <= width/2; x++) {
            view.rays[y][x] = direction;
          }
        }
      } else {
        
      }
      
      return view;
    }
  }
  
  $(document).ready(function() {
    Engine = makeEngine();
    Renderer = makeRenderer('#viewport');
    Engine.setRenderer(Renderer);
    
    var data = {
      //s1 : Geometry.makeShape('square2d', 20, 20, 40, 40),
      s1 : Geometry.makeShape('rect', 20, 20, 40, 40),
    };
    
    Engine.setData(data);
    
  });
  
})(this.jQuery)
