/*********************************************************************************************************************
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

const Color = require('color');
const ColorName = require('color-name');

class ThumborMapping {

    // Constructor
    constructor() {
        this.edits = {};
        this.sizingMethod;
    }

    /**
     * Initializer function for creating a new Thumbor mapping, used by the image
     * handler to perform image modifications based on legacy URL path requests.
     * @param {Object} event - The request body.
     */
    process(event) {
        // Setup
        this.path = event.path;
        const edits = this.path.split('/');
        const filetype = (this.path.split('.'))[(this.path.split('.')).length - 1];

        // Process the Dimensions
        const dimPath = this.path.match(/[^\/]\d+x\d+/g);
        if (dimPath) {
            const dims = dimPath[0].split('x');
            // Set only if the dimensions provided are valid
            if (!isNaN(dims[0]) && !isNaN(dims[1])) {
                this.edits.resize = {};
                this.edits.resize.fit = 'fill';

                // Assign dimenions from the first match only to avoid parsing dimension from image file names
                this.edits.resize.width = Number(dims[0]);
                this.edits.resize.height = Number(dims[1]);
            }
        }

        // Parse the image path
        for (let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            if (edit === ('fit-in')) {
                if (this.edits.resize === undefined) {
                    this.edits.resize = {};
                }

                this.edits.resize.fit = 'inside';
                this.sizingMethod = edit;
            } else if (edit.includes('filters:')) {
                this.mapFilter(edit, filetype);
            }
        }

        return this;
    }

    /**
     * Enables users to migrate their current image request model to the SIH solution,
     * without changing their legacy application code to accomodate new image requests.
     * @param {String} path - The URL path extracted from the web request.
     */
    parseCustomPath(path) {
        // Setup from the environment variables
        const matchPattern = process.env.REWRITE_MATCH_PATTERN;
        const substitution = process.env.REWRITE_SUBSTITUTION;
        // Perform the substitution and return
        if (path !== undefined && matchPattern !== undefined && substitution !== undefined) {
            const parsedPath = path.replace(matchPattern, substitution);
            const output = { path: parsedPath };
            return output;
        } else {
            throw new Error('ThumborMapping::ParseCustomPath::ParsingError');
        }
    }

    /**
     * Scanner function for matching supported Thumbor filters and converting their
     * capabilities into Sharp.js supported operations.
     * @param {String} edit - The URL path filter.
     * @param {String} filetype - The file type of the original image.
     */
    mapFilter(edit, filetype) {
        const matched = edit.match(/:(.+)\((.*)\)/);
        const key = matched[1];
        let value = matched[2];
        // Find the proper filter
        if (key === ('autojpg')) {
            this.edits.toFormat = 'jpeg';
        }
        else if (key === ('background_color')) {
            if (!ColorName[value]) {
                value = `#${value}`
            }
            this.edits.flatten = { background: Color(value).object() };
        }
        else if (key === ('blur')) {
            const val = value.split(',');
            this.edits.blur = (val.length > 1) ? Number(val[1]) : Number(val[0]) / 2;
        }
        else if (key === ('convolution')) {
            const arr = value.split(',');
            const strMatrix = (arr[0]).split(';');
            let matrix = [];
            strMatrix.forEach(function(str) {
                matrix.push(Number(str));
            });
            const matrixWidth = arr[1];
            let matrixHeight = 0;
            let counter = 0;
            for (let i = 0; i < matrix.length; i++) {
                if (counter === (matrixWidth - 1)) {
                    matrixHeight++;
                    counter = 0;
                } else {
                    counter++;
                }
            }
            this.edits.convolve = {
                width: Number(matrixWidth),
                height: Number(matrixHeight),
                kernel: matrix
            }
        }
        else if (key === ('equalize')) {
            this.edits.normalize = "true";
        }
        else if (key === ('fill')) {
            if (this.edits.resize === undefined) {
                this.edits.resize = {};
            }
            if (!ColorName[value]) {
                value = `#${value}`
            }
            this.edits.resize.background = Color(value).object();
        }
        else if (key === ('format')) {
            const formattedValue = value.replace(/[^0-9a-z]/gi, '').replace(/jpg/i, 'jpeg');
            const acceptedValues = ['heic', 'heif', 'jpeg', 'png', 'raw', 'tiff', 'webp'];
            if (acceptedValues.includes(formattedValue)) {
                this.edits.toFormat = formattedValue;
            }
        }
        else if (key === ('grayscale')) {
            this.edits.grayscale = true;
        }
        else if (key === ('no_upscale')) {
            if (this.edits.resize === undefined) {
                this.edits.resize = {};
            }
            this.edits.resize.withoutEnlargement = true;
        }
        else if (key === ('proportion')) {
            if (this.edits.resize === undefined) {
                this.edits.resize = {};
            }
            const prop = Number(value);
            this.edits.resize.width = Number(this.edits.resize.width * prop);
            this.edits.resize.height = Number(this.edits.resize.height * prop);
        }
        else if (key === ('quality')) {
            if (['jpg', 'jpeg'].includes(filetype)) {
                this.edits.jpeg = { quality: Number(value) }
            } else if (filetype === 'png') {
                this.edits.png = { quality: Number(value) }
            } else if (filetype === 'webp') {
                this.edits.webp = { quality: Number(value) }
            } else if (filetype === 'tiff') {
                this.edits.tiff = { quality: Number(value) }
            } else if (filetype === 'heif') {
                this.edits.heif = { quality: Number(value) }
            }
        }
        else if (key === ('rgb')) {
            const percentages = value.split(',');
            const values = [];
            percentages.forEach(function (percentage) {
                const parsedPercentage = Number(percentage);
                const val = 255 * (parsedPercentage / 100);
                values.push(val);
            })
            this.edits.tint = { r: values[0], g: values[1], b: values[2] };
        }
        else if (key === ('rotate')) {
            this.edits.rotate = Number(value);
        }
        else if (key === ('sharpen')) {
            const sh = value.split(',');
            const sigma = 1 + Number(sh[1]) / 2;
            this.edits.sharpen = sigma;
        }
        else if (key === ('stretch')) {
            if (this.edits.resize === undefined) {
                this.edits.resize = {};
            }
            if (this.sizingMethod === undefined || this.sizingMethod !== 'fit-in') {
                this.edits.resize.fit = "fill";
            }
        }
        else if (key === ('strip_exif')) {
            this.edits.rotate = 0;
        }
        else if (key === ('strip_icc')) {
            this.edits.rotate = 0;
        }
        else if (key === ('upscale')) {
            if (this.edits.resize === undefined) {
                this.edits.resize = {};
            }
            this.edits.resize.fit = "inside"
        }
        else if (key === ('watermark')) {
            const options = value.replace(/\s+/g, '').split(',');
            const bucket = options[0];
            const key = options[1];
            const xPos = options[2];
            const yPos = options[3];
            const alpha = options[4];
            const wRatio = options[5];
            const hRatio = options[6];

            this.edits.overlayWith = {
                bucket,
                key,
                alpha,
                wRatio,
                hRatio,
                options: {}
            }
            const allowedPosPattern = /^(100|[1-9]?[0-9]|-(100|[1-9][0-9]?))p$/;
            if (allowedPosPattern.test(xPos) || !isNaN(xPos)) {
                this.edits.overlayWith.options['left'] = xPos;
            }
            if (allowedPosPattern.test(yPos) || !isNaN(yPos)) {
                this.edits.overlayWith.options['top'] = yPos;
            }
        }
        else {
            return undefined;
        }
    }
}

// Exports
module.exports = ThumborMapping;