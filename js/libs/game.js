define([ 'Kinetic', 'settings', 'util' ], function( Kinetic, settings, util ){
    var game = {
        name: 'game',

        state: 'stopped',

        events: [],

        layer: new Kinetic.Layer({ opacity: 0 }),

        heart: {
            list: [],

            regenerate: function() {
                generateHeart();

                for ( var i = 0; i < settings.game.heart.maximum - 1; i++ ){
                    if ( util.calculate.random.float( 0, 100 ) < settings.game.heart.spawnProbability * 100 ){
                        generateHeart()
                    }
                }

                function generateHeart() {
                    var x = util.calculate.random.int( 2, settings.background.tile.quantity.x - 1 ),
                        y = util.calculate.random.int( 2, settings.background.tile.quantity.y - 1 );

                    if ( game.collision({ coords: { x: x, y: y }, list: game.heart.list }) === -1 &&
                         game.collision({ coords: { x: x, y: y }, list: game.snake.segment.list }) === -1 ){

                        var heart = game.heart.proto.clone({
                            x: x.fromCoord(),
                            y: y.fromCoord()
                        });

                        game.heart.list.push( heart );
                        game.layer.add( heart );
                        heart.setZIndex( 2 );

                    } else generateHeart();
                }
            }
        },

        snake: {
            lastMovementTime: 0,

            segment: {
                queue: [],

                list: [],

                queueNew: function() {
                    var segment = {};

                    if ( game.snake.segment.list.length > 0 ){
                        segment.x = game.snake.segment.list.last().x();
                        segment.y = game.snake.segment.list.last().y();
                    } else {
                        segment.x = settings.game.snake.initial.coords.x * settings.background.tile.size;
                        segment.y = settings.game.snake.initial.coords.y * settings.background.tile.size;
                    }

                    segment.shape = game.snake.proto.clone({ x: segment.x, y: segment.y });
                    game.snake.segment.queue.push( segment.shape );
                },

                addNewIfNecessary: function() {
                    if ( game.snake.segment.queue.length > 0 ){
                        var segment = game.snake.segment.queue.shift();

                        game.snake.segment.list.push( segment );

                        game.layer.add( segment );
                    }
                }
            },

            direction: {
                queue: [ settings.game.snake.initial.direction ],

                current: settings.game.snake.initial.direction,

                changeIfNecessary: function() {
                    if ( game.snake.direction.queue.length > 0 ){
                        game.snake.direction.current = game.snake.direction.queue.shift()
                    }
                },

                currentIsNotOppositeOf: function( direction ){
                    if ( game.snake.segment.list.length === 1 ){
                        return true
                    } else {
                        var opposite;

                        if ( game.snake.direction.current === 'up' ) opposite = 'down';
                        else if ( game.snake.direction.current === 'down' ) opposite = 'up';
                        else if ( game.snake.direction.current === 'left' ) opposite = 'right';
                        else if ( game.snake.direction.current === 'right' ) opposite = 'left';

                        return !( direction == opposite );
                    }
                },

                lastQueuedIsNotSameAs: function( direction ){
                    return !( game.snake.direction.queue.last() == direction )
                },

                pushOrInit: function( direction ){
                    if ( game.state === 'starting'){
                        game.snake.direction.queue[0] = direction

                    } else game.snake.direction.queue.push( direction )
                }
            },

            move: function() {
                game.snake.direction.changeIfNecessary();

                if ( game.snake.segment.list.length > 1 ){
                    game.snake.segment.list.unshift( game.snake.segment.list.pop() );
                    move( game.snake.segment.list[1] )
                } else {
                    move( game.snake.segment.list[0] )
                }

                function move( to ){
                    if ( game.snake.direction.current === 'up' ){
                        game.snake.segment.list[0].x( to.x() );
                        game.snake.segment.list[0].y( to.y() - settings.background.tile.size );

                    } else if ( game.snake.direction.current === 'right' ){
                        game.snake.segment.list[0].x( to.x() + settings.background.tile.size );
                        game.snake.segment.list[0].y( to.y() )

                    } else if ( game.snake.direction.current === 'down' ){
                        game.snake.segment.list[0].x( to.x() );
                        game.snake.segment.list[0].y( to.y() + settings.background.tile.size )

                    } else {
                        game.snake.segment.list[0].x( to.x() - settings.background.tile.size );
                        game.snake.segment.list[0].y( to.y() );
                    }
                }
            },

            isCollidingWith: {
                itself: function() {
                    return game.collision({ shape: game.snake.segment.list[ 0 ], list: game.snake.segment.list }) !== -1;
                },

                boundary: function() {
                    return game.snake.segment.list[ 0 ].x().toCoord() == 1 ||
                           game.snake.segment.list[ 0 ].x().toCoord() == settings.background.tile.quantity.x ||
                           game.snake.segment.list[ 0 ].y().toCoord() == 1 ||
                           game.snake.segment.list[ 0 ].y().toCoord() == settings.background.tile.quantity.y;
                },

                heart: function( cb ){
                    cb( game.collision({ shape: game.snake.segment.list[ 0 ], list: game.heart.list }) )
                }
            }
        },

        counter: {
            list: [],

            add: function() { // todo
                var xOffset = 0;

                if ( game.snake.segment.list.length > 10 ) xOffset = settings.background.tile.size * 1.25;
                else if ( game.snake.segment.list.length > 100 ) xOffset = settings.background.tile.size * 2.5;

                var counter = game.counter.proto.clone({
                    x: game.snake.segment.list[ 0 ].x() - xOffset,
                    y: game.snake.segment.list[ 0 ].y() - settings.background.tile.size * 1.2,
                    text: game.snake.segment.list.length + 1
                });

                game.counter.list.push( counter );

                game.layer.add( counter );
            }
        },

        collision: function( options ){
            var i;

            if ( options.shape ){
                if ( options.list ){
                    for ( i = 0; i < options.list.length; i++ ){
                        if ( options.shape != options.list[ i ] &&
                             options.list[ i ].x().toCoord() == options.shape.x().toCoord() &&
                             options.list[ i ].y().toCoord() == options.shape.y().toCoord() ){

                            return i;
                        }
                    }
                } else throwListError();

            } else if ( options.coords ){
                if ( options.list ){
                    for ( i = 0; i < options.list.length; i++ ){
                        if ( options.list[ i ].x().toCoord() == options.coords.x &&
                             options.list[ i ].y().toCoord() == options.coords.y ){

                            return i;
                        }
                    }
                } else throwListError();

            } else throw new Error( 'The collision detector was provided neither a coordinate pair nor shape to search for');

            return -1;

            function throwListError() {
                throw new Error( 'The collision detector was not provided a list in which to search for the provided shape')
            }
        },

        isMoveCycle: function( frame ){
            return frame.time - game.snake.lastMovementTime >= ( settings.animation.period -
                    ( game.snake.segment.list.length * settings.game.snake.speedIncrement )) / 2
        },

        cleanUp: function() {
            game.snake.segment.list.forEach( function( segment ){ segment.destroy() });
            game.heart.list.forEach( function( heart ){ heart.destroy() });
            game.counter.list.forEach( function( counter ){ counter.destroy() });

            game.snake.segment.list = [];
            game.snake.segment.queue = [];
            game.snake.direction.queue = [ settings.game.snake.initial.direction ];
            game.snake.direction.current = settings.game.snake.initial.direction;

            game.heart.list = [];

            game.counter.list = [];
        },

        init: _.once( function( options ){
            ( function _bg() {
                game.background = options.background;
                game.layer.add( options.background.game )
            })();

            ( function _calculations() {
                _.extend( settings.game.counter, {
                    shadow: {
                        blur: util.calculate.absolute.size( 100 )
                    },

                    font: {
                        size: util.calculate.absolute.size( 11 ) * 2
                    }
                });
            })();

            ( function _numberToCoordinate() {
                Number.prototype.toCoord = function() {
                    return ( this / settings.background.tile.size ) + 2
                };

                Number.prototype.fromCoord = function() {
                    return ( this - 2 ) * settings.background.tile.size
                };
            })();

            ( function _boundary() {
                game.boundaries = {};

                game.boundaries.top = new Kinetic.Rect({
                    x: settings.background.tile.size / 4,
                    y: settings.background.tile.size / 4,
                    width: ( settings.background.tile.size * settings.background.tile.quantity.x ) -
                        settings.background.tile.size ,
                    height: settings.background.tile.size / 2,
                    fill: settings.game.boundary.color.palette[ 0 ]
                });

                game.layer.add( game.boundaries.top );


                game.boundaries.left = new Kinetic.Rect({
                    x: settings.background.tile.size / 4,
                    y: settings.background.tile.size / 4,
                    width: settings.background.tile.size / 2,
                    height: ( settings.background.tile.size * settings.background.tile.quantity.y ) -
                        settings.background.tile.size,
                    fill: settings.game.boundary.color.palette[ 0 ]
                });

                game.layer.add( game.boundaries.left );


                game.boundaries.bottom = new Kinetic.Rect({
                    x: settings.background.tile.size / 4,
                    y: settings.background.tile.size * ( settings.background.tile.quantity.y - 0.75 ),
                    width: ( settings.background.tile.size * settings.background.tile.quantity.x ) -
                        settings.background.tile.size ,
                    height: settings.background.tile.size / 2,
                    fill: settings.game.boundary.color.palette[ 0 ]
                });

                game.layer.add( game.boundaries.bottom );


                game.boundaries.right = new Kinetic.Rect({
                    x: window.innerWidth - ( settings.background.tile.size * 0.75 ),
                    y: 0,
                    width: settings.background.tile.size / 2,
                    height: settings.background.tile.size * settings.background.tile.quantity.y,
                    fill: settings.game.boundary.color.palette[ 0 ]
                });

                game.layer.add( game.boundaries.right );


                game.boundaries.lastCycleTime = 0;


                game.boundaries.cycleColors = function( frame ){
                    if ( frame.time - game.boundaries.lastCycleTime >= settings.animation.period / 8 ){

                        ( function( color ){
                            game.boundaries.top.fill( color );
                            game.boundaries.left.fill( color );
                            game.boundaries.bottom.fill( color );
                            game.boundaries.right.fill( color );
                        })( settings.background.tile.color.random() );

                        settings.game.boundary.color.palette.unshift( settings.game.boundary.color.palette.pop() );
                        game.boundaries.lastCycleTime = frame.time
                    }


                }
            })();

            ( function _heartPrototype() {
                var color = settings.game.heart.initial.color;

                game.heart.proto = new Kinetic.Group();

                for ( var i = 0; i < settings.game.heart.amountOfInnerHearts + 1; i++ ){
                    var innerHeart = new Kinetic.Text({
                        x: settings.background.tile.size + i * (( settings.background.tile.size * 0.33 ) / 2 ),
                        y: settings.background.tile.size + i * (( settings.background.tile.size * 0.33 ) / 2 ),
                        fontSize: settings.background.tile.size - i * ( settings.background.tile.size * 0.33 ),
                        fontFamily: 'FontAwesome',
                        text: '\uf004',
                        fill: 'hsl(' +
                            color.h + ', ' +
                            color.s + '%, ' +
                            color.l + '%)'
                    });

                    color.l -= 5;

                    game.heart.proto.add( innerHeart )
                }
            })();

            ( function _segmentPrototype() {
                var palette = settings.game.snake.color.palete;

                game.snake.proto = new Kinetic.Group();

                for ( var i = 0; i < settings.game.snake.amountOfInnerRectangles + 1; i++ ){
                    var rect = new Kinetic.Rect({
                        x: settings.background.tile.size + i * (( settings.background.tile.size * 0.33 ) / 2 ),
                        y: settings.background.tile.size + i * (( settings.background.tile.size * 0.33 ) / 2 ),
                        width: settings.background.tile.size - i * ( settings.background.tile.size * 0.33 ),
                        height: settings.background.tile.size - i * ( settings.background.tile.size * 0.33 ),
                        fill: palette[ i ]
                    });

                    game.snake.proto.add( rect )
                }
            })();

            ( function _counterPrototype() {
                game.counter.proto = new Kinetic.Text({
                    fontSize: settings.game.counter.font.size,
                    fontFamily: settings.font.ui,
                    fill: settings.game.counter.font.color,
                    shadowColor: settings.game.counter.shadow.color,
                    shadowBlur: settings.game.counter.shadow.blur
                })
            })();

            ( function _animation() {
                game.animation = new Kinetic.Animation( function( frame ){
                    if ( game.state === 'starting' ){
                        if ( game.snake.segment.list.length === 0 ){
                            game.heart.regenerate();
                            game.snake.segment.queueNew();
                            game.snake.segment.addNewIfNecessary()
                        }

                        util.animation.fade( game.layer, frame, 'in' );

                        if ( game.layer.opacity() === 1 ) game.state = 'running'

                    } else if ( game.state === 'running' ){
                        game.boundaries.cycleColors( frame );

                        if ( game.isMoveCycle( frame )){

                            game.snake.lastMovementTime = frame.time;
                            game.snake.move();
                            game.snake.segment.addNewIfNecessary();

                            if ( game.snake.isCollidingWith.itself() ) game.state = 'stopping';
                            if ( game.snake.isCollidingWith.boundary() ) game.state = 'stopping';

                            game.snake.isCollidingWith.heart( function( index ){
                                if ( index !== -1 ){
                                    game.snake.segment.queueNew();

                                    game.counter.add();

                                    // game.background.tile.cycleColors(); todo

                                    game.heart.list[ index ].destroy();
                                    game.heart.list.splice( index, 1 );
                                    if ( game.heart.list.length === 0 ) game.heart.regenerate();
                                }
                            })
                        }
                    } else if ( game.state === 'stopping' ) util.animation.fadeAndStop( game, frame, function() {
                        game.cleanUp()
                    });

//todo
//                    game.counter.list.forEach( function( counter ){
//                        counter.opacity(
//                            counter.opacity() - settings.animation.transition.speed > 0 ?
//                                counter.opacity() - settings.animation.transition.speed : 0
//                        );
//
//                        if ( counter.opacity() === 0 ){
//                            counter.destroy();
//                            game.counter.list.splice( game.counter.list.indexOf( counter ), 1);
//                        }
//                    })
                }, game.layer )
            })();
        })
    };

    Array.prototype.last = function() {
        return this[ this.length - 1 ];
    };

    return game;
});