var BSON = require('bson');
// var BSON = new bson();
var compressjs = require('compressjs');
var algorithm = compressjs.Bzip2;
var PNG = require('pngjs').PNG;
var fs = require("fs");
var assert = require('assert');
var Promise = require('bluebird');
var jpeg = require('jpeg-js');
var child_process = require('child_process');
Promise.promisifyAll(fs);

function doMapShift(image) {
    var data = {};
    for (var y = 0; y < image.height; y++) {
        data[y + 4] = {};
        for (var x = 0; x < image.width; x++) {
            data[y + 4][x + 4] = [];
            var idx = (image.width * y + x) << 2;
            data[y + 4][x + 4][1] = image.data[idx];
            data[y + 4][x + 4][2] = image.data[idx + 1];
            data[y + 4][x + 4][3] = image.data[idx + 2];
            data[y + 4][x + 4][0] = image.data[idx + 3];
        }
    }
    return data;
}
function PNGtoMap(s) {
    return new Promise((resolve, reject) => {
        var rs = fs.createReadStream(s);
        var png = rs.pipe(new PNG());
        rs.on('error', err => reject(err));
        png.on('parsed', () => {
            resolve(doMapShift(png));
        });
    });
}
function JPEGtoMap(s) {
    return fs.readFileAsync(s)
    .then(image => {
        image = jpeg.decode(image);
        return Promise.resolve(doMapShift(image));
    });
}
function parseOPS(data, ra) {
    var headers = data.slice(0, 12);
    var _data = data.slice(12);
    var decompressed = algorithm.decompressFile(_data);

    var data2 = Buffer.from(decompressed);
    var bdata = BSON.deserialize(data2);
    // console.log(bdata);
    if (ra) return bdata; // DEPRECATED use parseOPS(...).props instead
    var hinfo = {
        version: headers[4],
        wallSize: headers[5],
        width: headers[6],
        height: headers[7],
    }
    var fullH = (hinfo.wallSize * hinfo.height);
    var fullW = (hinfo.wallSize * hinfo.width);
    var fullX = 0 * hinfo.wallSize;
    var fullY = 0 * hinfo.wallSize;
    var blockX = 0 * hinfo.wallSize;
    var blockY = 0 * hinfo.wallSize;
    var blockW = hinfo.width;
    var blockH = hinfo.height;
    if (bdata.parts && bdata.partsPos) {
        assert(bdata.partsPos.buffer.length == (hinfo.wallSize * hinfo.width) * (hinfo.wallSize * hinfo.height) * 3); // Do NOT contine with bad data.
        var saved_x, saved_y, posTotal, fieldDescriptor, tempTemp;
        var particlesCount = 0;
        var newIndex = 0;
        var partsData = bdata.parts.buffer
        var partsPosData = bdata.partsPos.buffer;
        var partsPosDataIndex = 0;
        var fullH = (hinfo.wallSize * hinfo.height);
        var fullW = (hinfo.wallSize * hinfo.width);
        var particles = [];
        var fullX = 0 * hinfo.wallSize;
        var fullY = 0 * hinfo.wallSize;
        var i = 0;
        for (saved_y = 0; saved_y < fullH; saved_y++) {
            for (saved_x = 0; saved_x < fullW; saved_x++) {
                try {
                    posTotal = 0;
                    posTotal |= partsPosData[partsPosDataIndex++] << 16;
                    posTotal |= partsPosData[partsPosDataIndex++] << 8;
                    posTotal |= partsPosData[partsPosDataIndex++];
                    for (var posCount = 0; posCount < posTotal; posCount++) {
                        particlesCount = newIndex + 1;
                        x = saved_x + fullX;
                        y = saved_y + fullY;
                        fieldDescriptor = partsData[i + 1];
                        fieldDescriptor |= partsData[i + 2] << 8;
                        particles[newIndex] = {};
                        particles[newIndex].type = partsData[i];
                        particles[newIndex].x = x;
                        particles[newIndex].y = y;
                        particles[newIndex].pavg = [];
                        i += 3;
                        //Read temp
                        if (fieldDescriptor & 0x01) {
                            //Full 16bit int
                            tempTemp = partsData[i++];
                            tempTemp |= (partsData[i++] << 8);
                            particles[newIndex].temp = tempTemp;
                        } else {
                            //1 Byte room temp offset
                            tempTemp = partsData[i++];
                            particles[newIndex].temp = tempTemp + 294.15;
                        }
                        //Read life
                        if (fieldDescriptor & 0x02) {
                            particles[newIndex].life = partsData[i++];
                            //Read 2nd byte
                            if (fieldDescriptor & 0x04) {
                                particles[newIndex].life |= (partsData[i++] << 8);
                            }
                        }

                        //Read tmp
                        if (fieldDescriptor & 0x08) {
                            particles[newIndex].tmp = partsData[i++];
                            //Read 2nd byte
                            if (fieldDescriptor & 0x10) {
                                particles[newIndex].tmp |= (partsData[i++] << 8);
                                //Read 3rd and 4th bytes
                                if (fieldDescriptor & 0x1000) {
                                    particles[newIndex].tmp |= (partsData[i++] << 24);
                                    particles[newIndex].tmp |= (partsData[i++] << 16);
                                }
                            }
                        }
                        //Read ctype
                        if (fieldDescriptor & 0x20) {
                            particles[newIndex].ctype = partsData[i++];
                            //Read additional bytes
                            if (fieldDescriptor & 0x200) {
                                particles[newIndex].ctype |= (partsData[i++] << 24);
                                particles[newIndex].ctype |= (partsData[i++] << 16);
                                particles[newIndex].ctype |= (partsData[i++] << 8);
                            }
                        }

                        //Read dcolour
                        if (fieldDescriptor & 0x40) {
                            particles[newIndex].dcolour = (partsData[i++] << 24);
                            particles[newIndex].dcolour |= (partsData[i++] << 16);
                            particles[newIndex].dcolour |= (partsData[i++] << 8);
                            particles[newIndex].dcolour |= (partsData[i++]);
                        }

                        //Read vx
                        if (fieldDescriptor & 0x80) {
                            particles[newIndex].vx = (partsData[i++] - 127.0) / 16.0;
                        }

                        //Read vy
                        if (fieldDescriptor & 0x100) {
                            particles[newIndex].vy = ((partsData[i++] - 127) / 16);
                        }

                        //Read tmp2
                        if (fieldDescriptor & 0x400) {
                            particles[newIndex].tmp2 = partsData[i++];
                            if (fieldDescriptor & 0x800) {
                                particles[newIndex].tmp2 |= (partsData[i++] << 8);
                            }
                        }

                        //Read pavg
                        if (fieldDescriptor & 0x2000) {
                            var pavg;
                            pavg = partsData[i++];
                            pavg |= (partsData[i++] << 8);
                            particles[newIndex].pavg[0] = pavg;
                            pavg = partsData[i++];
                            pavg |= (partsData[i++] << 8);
                            particles[newIndex].pavg[1] = pavg;
                        }
                        newIndex++;
                    }
                } catch (e) {
                    console.log(e)
                }
            }
        }
    }
    if (bdata.wallMap) {
        var blockMap = [];
        var wallData = bdata.wallMap.buffer;
        for (var x = 0; x < fullW; x++) {
            for (var y = 0; y < fullH; y++) {
                if (wallData[y * blockW + x]) {
                    if (!blockMap[blockY + y]) blockMap[blockY + y] = [];
                    blockMap[blockY + y][blockX + x] = wallData[y * blockW + x];
                }
            }
        }
    }
    /*
    var rbdata = bdata;
    delete(rbdata.partsPos);
    delete(rbdata.parts)
    delete(rbdata.wallMap);
    delete(rbdata.fanMap);
    delete(rbdata.soapLinks);
    */
    var parsed = {
        headers: hinfo,
        particles: (particles || {}),
        //props: rbdata,
        signs: (bdata.signs || []),
        props: bdata
    };
    return parsed;
}

function packOPS(data) {
    return new Promise((resolve, reject) => {
        var body = BSON.serialize(data);
        var bzip2 = child_process.spawn('bzip2');
        var compressed = Buffer.alloc(0);
        bzip2.stdout.on('data', d => compressed = Buffer.concat([compressed, d]))
        .on('error', reject)
        .on('end', () => {
            var final = Buffer.concat([Buffer.from("OPS1", "binary"), Buffer.from([data.origin.majorVersion, 0x4, 0x99, 0x60])]);
            var dlen = body.length;
            final = Buffer.concat([final, Buffer.from([dlen, dlen >> 8, dlen >> 16, dlen >> 24])]);
            final = Buffer.concat([final, compressed]);
            return resolve(final);
        });
        bzip2.stdin.write(body, () => bzip2.stdin.end());
    });
};

function modPartMap(hinfo, bdata, decorep) {
    var fullH = (hinfo.wallSize * hinfo.height);
    var fullW = (hinfo.wallSize * hinfo.width);
    var fullX = 0 * hinfo.wallSize;
    var fullY = 0 * hinfo.wallSize;
    var blockX = 0 * hinfo.wallSize;
    var blockY = 0 * hinfo.wallSize;
    var blockW = hinfo.width;
    var blockH = hinfo.height;
    console.log("FLAG1")
    if (bdata.parts && bdata.partsPos) {
        console.log("FLAG2")
        require("assert")(bdata.partsPos.buffer.length == (hinfo.wallSize * hinfo.width) * (hinfo.wallSize * hinfo.height) * 3) // Do NOT contine with bad data.
        var saved_x, saved_y, posTotal, fieldDescriptor, tempTemp;
        var particlesCount = 0;
        var newIndex = 0;
        var partsData = [...bdata.parts.buffer];
        var partsPosData = bdata.partsPos.buffer;
        var partsPosDataIndex = 0;
        var fullH = (hinfo.wallSize * hinfo.height);
        var fullW = (hinfo.wallSize * hinfo.width);
        var particles = [];
        var fullX = 0 * hinfo.wallSize;
        var fullY = 0 * hinfo.wallSize;
        var i = 0;
        for (saved_y = 0; saved_y < fullH; saved_y++) {
            for (saved_x = 0; saved_x < fullW; saved_x++) {
                try {
                    posTotal = 0;
                    posTotal |= partsPosData[partsPosDataIndex++] << 16;
                    posTotal |= partsPosData[partsPosDataIndex++] << 8;
                    posTotal |= partsPosData[partsPosDataIndex++];
                    for (var posCount = 0; posCount < posTotal; posCount++) {
                        particlesCount = newIndex + 1;
                        var x = saved_x + fullX;
                        var y = saved_y + fullY;
                        fieldDescriptor = partsData[i + 1];
                        fieldDescriptor |= partsData[i + 2] << 8;
                        let hasDeco = Boolean(fieldDescriptor & 0x40);
                        if(partsData[i]) partsData[i + 1] = partsData[i + 1] | 0x40;
                        particles[newIndex] = {};
                        particles[newIndex].type = partsData[i];
                        particles[newIndex].x = x;
                        particles[newIndex].y = y;
                        particles[newIndex].pavg = [];
                        if(fieldDescriptor>8) console.log(fieldDescriptor.toString(2));
                        i += 3;
                        //Read temp
                        if (fieldDescriptor & 0x01) {
                            //Full 16bit int
                            tempTemp = partsData[i++];
                            tempTemp |= (partsData[i++] << 8);
                            particles[newIndex].temp = tempTemp;
                        } else {
                            //1 Byte room temp offset
                            tempTemp = partsData[i++];
                            particles[newIndex].temp = tempTemp + 294.15;
                        }
                        //Read life
                        if (fieldDescriptor & 0x02) {
                            particles[newIndex].life = partsData[i++];
                            //Read 2nd byte
                            if (fieldDescriptor & 0x04) {
                                particles[newIndex].life |= (partsData[i++] << 8);
                            }
                        }

                        //Read tmp
                        if (fieldDescriptor & 0x08) {
                            particles[newIndex].tmp = partsData[i++];
                            //Read 2nd byte
                            if (fieldDescriptor & 0x10) {
                                particles[newIndex].tmp |= (partsData[i++] << 8);
                                //Read 3rd and 4th bytes
                                if (fieldDescriptor & 0x1000) {
                                    particles[newIndex].tmp |= (partsData[i++] << 24);
                                    particles[newIndex].tmp |= (partsData[i++] << 16);
                                }
                            }
                        }
                        //Read ctype
                        if (fieldDescriptor & 0x20) {
                            particles[newIndex].ctype = partsData[i++];
                            //Read additional bytes
                            if (fieldDescriptor & 0x200) {
                                particles[newIndex].ctype |= (partsData[i++] << 24);
                                particles[newIndex].ctype |= (partsData[i++] << 16);
                                particles[newIndex].ctype |= (partsData[i++] << 8);
                            }
                        }

                        //Read dcolour
                        if (hasDeco) {
                            var dr = decorep(partsData[i], partsData[i + 1], partsData[i + 2], partsData[i + 3], particles[newIndex]);
                            partsData[i] = dr[0];
                            partsData[i + 1] = dr[1];
                            partsData[i + 2] = dr[2];
                            partsData[i + 3] = dr[3];
                            particles[newIndex].dcolour = (partsData[i++] << 24);
                            particles[newIndex].dcolour |= (partsData[i++] << 16);
                            particles[newIndex].dcolour |= (partsData[i++] << 8);
                            particles[newIndex].dcolour |= (partsData[i++]);
                        } else {
                            if(particles[newIndex].type > 0) { // no deco :(
                                var dr = decorep(0,0,0,0, particles[newIndex]);
                                partsData.splice(i++,0,dr[0]);
                                partsData.splice(i++,0,dr[1]);
                                partsData.splice(i++,0,dr[2]);
                                partsData.splice(i++,0,dr[3]);
                            }
                        }

                        //Read vx
                        if (fieldDescriptor & 0x80) {
                            particles[newIndex].vx = (partsData[i++] - 127.0) / 16.0;
                        }

                        //Read vy
                        if (fieldDescriptor & 0x100) {
                            particles[newIndex].vy = ((partsData[i++] - 127) / 16);
                        }

                        //Read tmp2
                        if (fieldDescriptor & 0x400) {
                            particles[newIndex].tmp2 = partsData[i++];
                            if (fieldDescriptor & 0x800) {
                                particles[newIndex].tmp2 |= (partsData[i++] << 8);
                            }
                        }

                        //Read pavg
                        if (fieldDescriptor & 0x2000) {
                            var pavg;
                            pavg = partsData[i++];
                            pavg |= (partsData[i++] << 8);
                            particles[newIndex].pavg[0] = pavg;
                            pavg = partsData[i++];
                            pavg |= (partsData[i++] << 8);
                            particles[newIndex].pavg[1] = pavg;
                        }
                        newIndex++;
                    }
                } catch (e) {
                    console.log(e)
                }
            }
        }
    }
    bdata.parts.buffer = Buffer.from(partsData, "binary");
    return bdata;
}
//console.log(parseOPS(require("fs").readFileSync(process.argv[2])));
module.exports = {
    parseOPS,
    packOPS,
    modPartMap,
    PNGtoMap,
    JPEGtoMap
}
