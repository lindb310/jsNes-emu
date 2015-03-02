/*
 jsNes-emu, heavily adapted from Ben Firshman's JSNES
 Copyright (C) 2010 Ben Firshman
 Copyright (C) 2015 Jeff Lindblom

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

define(function(require) {
    "use strict";

    var Utils = require('./utils');
    var DynamicAudio = require('DynamicAudio');

    var UI = function(nes) {
        var self = this;
        self.nes = nes;
        self.canvasContext = self.nes.screen.getContext('2d');

        if (!self.canvasContext.getImageData) {
            parent.html("Your browser doesn't support writing pixels directly to the <code>&lt;canvas&gt;</code> tag. Try the latest versions of Google Chrome, Safari, Opera or Firefox!");
            return;
        }

        self.canvasImageData = self.canvasContext.getImageData(0, 0, 256, 240);
        self.resetCanvas();

        /*
         * Keyboard
         */
        $(document).
            bind('keydown', function(evt) {
                self.nes.keyboard.keyDown(evt);
            }).
            bind('keyup', function(evt) {
                self.nes.keyboard.keyUp(evt);
            }).
            bind('keypress', function(evt) {
                self.nes.keyboard.keyPress(evt);
            });

        /*
         * Sound
         */
        self.dynamicaudio = new DynamicAudio({
            swf: nes.opts.swfPath + 'dynamicaudio.swf'
        });
    };

    UI.prototype = {
        loadROM: function(romLocation) {
            var self = this;
            self.updateStatus("Downloading...");
            $.ajax({
                url: escape(romLocation),
                xhr: function() {
                    var xhr = $.ajaxSettings.xhr();
                    if (typeof xhr.overrideMimeType !== 'undefined') {
                        // Download as binary
                        xhr.overrideMimeType('text/plain; charset=x-user-defined');
                    }
                    self.xhr = xhr;
                    return xhr;
                },
                complete: function(xhr, status) {
                    var i, data;
                    if (Utils.isIE()) {
                        var charCodes = JSNESBinaryToArray(
                            xhr.responseBody
                        ).toArray();
                        data = String.fromCharCode.apply(
                            undefined,
                            charCodes
                        );
                    }
                    else {
                        data = xhr.responseText;
                    }
                    self.nes.loadRom(data);
                    self.nes.start();
                }
            });
        },

        resetCanvas: function() {
            this.canvasContext.fillStyle = 'black';
            // set alpha to opaque
            this.canvasContext.fillRect(0, 0, 256, 240);

            // Set alpha
            for (var i = 3; i < this.canvasImageData.data.length - 3; i += 4) {
                this.canvasImageData.data[i] = 0xFF;
            }
        },

        /*
         * nes.ui.screenshot() --> return <img> element :)
         */
        screenshot: function() {
            var data = this.nes.screen.toDataURL("image/png"),
                img = new Image();
            img.src = data;
            return img;
        },

        updateStatus: function(s) {
            console.log(s);
        },

        writeAudio: function(samples) {
            return this.dynamicaudio.writeInt(samples);
        },

        writeFrame: function(buffer, prevBuffer) {
            var imageData = this.canvasImageData.data;
            var pixel, i, j;

            for (i = 0; i < 256 * 240; i++) {
                pixel = buffer[i];

                if (pixel != prevBuffer[i]) {
                    j = i * 4;
                    imageData[j] = pixel & 0xFF;
                    imageData[j + 1] = (pixel >> 8) & 0xFF;
                    imageData[j + 2] = (pixel >> 16) & 0xFF;
                    prevBuffer[i] = pixel;
                }
            }

            this.canvasContext.putImageData(this.canvasImageData, 0, 0);
        }
    };

    return UI;
});
