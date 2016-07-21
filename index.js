'use strict';

var Canvas = require('canvas');
var request = require('request');

function createCanvas(options) {
    if (!options) {
        return Promise.reject(new Error('No canvas object'));
    }
    var canvasWidth = parseInt(options.width) || 500;
    var canvasHeight = parseInt(options.height) || 500;

    var canvas = new Canvas(canvasWidth, canvasHeight);
    var ctx = canvas.getContext('2d');

    if (options.backgroundColor) {
        ctx.fillStyle = options.backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    return Promise.resolve(canvas);
}

function addImage(ctx, options) {
    return new Promise((resolve, reject) => {

        if (!ctx) {
            return reject(new Error('No context passed'));
        }

        if (!options.imageUrl) {
            return reject(new Error('No image url'));
        }

        request(options.imageUrl, {
            encoding: null
        }, function(error, response, buffer) {
            var imgWidth;
            var imgHeight;
            var imgX;
            var imgy;
            var Image;
            var img;
            //we should have an error handler...
            if (error) {
                return reject(error);
            }

            //we create the image...
            Image = Canvas.Image;
            img = new Image();

            //we load the downloaded image
            img.src = buffer;

            imgX = parseInt(options.x) || 0;
            imgy = parseInt(options.y) || 0;

            if (options.width && !options.height) {
                imgWidth = parseInt(options.width);
                imgHeight = img.height / img.width * parseInt(options.width);
            }

            if (!options.width && options.height) {
                imgWidth = img.width / img.height * parseInt(options.height);
                imgHeight = parseInt(options.height);
            }

            if (!options.width && !options.height) {
                imgWidth = img.width;
                imgHeight = img.height;
            }

            //we add it to the ctx....
            try {
                ctx.drawImage(img, imgX, imgy, imgWidth, imgHeight);
            } catch (e) {
                return reject(new Error('Image could not be imported.'));
            }

            //we return the context to keep on adding stuff...
            return resolve(ctx);
        });
    });
}

function addText(ctx, options) {
    if (!options.text) {
        return Promise.reject(new Error('No text'));
    }

    var textColor = options.color || 'white';
    var textSize = options.size || '50px';
    var textFont = options.font || 'Arial';
    var textWeight = options.weight || 'normal';
    var textAlign = options.align || 'left';
    var textBaseline = options.baseline || 'middle';
    var textX = parseInt(options.x) || 0;
    var textY = parseInt(options.y) || 0;

    ctx.fillStyle = textColor;
    ctx.font = textWeight + ' ' + textSize + 'px "' + textFont + '"';
    ctx.textBaseline = textBaseline;
    ctx.textAlign = textAlign;
    ctx.fillText(options.text, textX, textY);
    return Promise.resolve(ctx);
}



function captionate(configuration) {
    // console.log(configuration);
    var canvasOptions = configuration.filter(function(option) {
        return option.type === 'canvas';
    })[0];

    // console.log(canvasOptions);

    if (!canvasOptions) {
        canvasOptions = {};
    }

    configuration = configuration.filter(function(option) {
        return option.type !== 'canvas';
    });

    configuration = configuration.sort((a, b) => {
        //if they have no z index, by default they go all the way down
        if (!a.zIndex) {
            a.zIndex = 1;
        }
        if (!b.zIndex) {
            b.zIndex = 1;
        }
        return a.zIndex - b.zIndex;
    });

    var promisesArray = [];

    configuration = configuration.filter(function(option) {
        switch (option.type) {
            case 'image':
                promisesArray.push(addImage);
                return true;
            case 'text':
                promisesArray.push(addText);
                return true;
            default:
                return false;
        }
    });

    return new Promise(function(resolve, reject) {

        createCanvas(canvasOptions)
            .then(function(canvas) {

                var ctx = canvas.getContext('2d');

                promisesArray.reduce(function(prev, curr, index) {
                        return prev.then((ctx) => curr(ctx, configuration[index]));
                    }, Promise.resolve(ctx))
                    .then(function() {
                        canvas.toBuffer(function(error, buffer) {
                            if (error) {
                                return reject(error);
                            }
                            return resolve(buffer);
                        });
                    })
                    .catch(function(err) {
                        return reject(err);
                    });

            });
    });
}

module.exports = captionate;
