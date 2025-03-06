// Get canvas element
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

var w = 18;
var h = 18;
var blockSize = 40;

var gameOver = false;
var map, blocks, groups, ranges, temp, sweeperCount, marked;
var flagPath = new Path2D('M3 2.25a.75.75 0 0 1 .75.75v.54l1.838-.46a9.75 9.75 0 0 1 6.725.738l.108.054A8.25 8.25 0 0 0 18 4.524l3.11-.732a.75.75 0 0 1 .917.81 47.784 47.784 0 0 0 .005 10.337.75.75 0 0 1-.574.812l-3.114.733a9.75 9.75 0 0 1-6.594-.77l-.108-.054a8.25 8.25 0 0 0-5.69-.625l-2.202.55V21a.75.75 0 0 1-1.5 0V3A.75.75 0 0 1 3 2.25Z');
var flagSize = 24;
var colors = {
    original: ['#A2D149', '#ABD751'],
    revealed: ['#D8B899', '#E6C29F']
}
var revealedCount = 0;

/*************************************
[0, 0, 0]
[0, 1, 1] -> (x,y) -> map[y, x]
[1, 1, 0]
*************************************/

function generateMap(w, h) {
    var map = Array.from({ length: h }, () => Array(w).fill(0));
    sweeperCount = Math.floor(w * h / 8);

    let positions = [];
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            positions.push([r, c]);
        }
    }

    for (let i = positions.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < sweeperCount; i++) {
        let [y, x] = positions[i];
        map[y][x] = 1;
    }

    groups = [], temp = [], ranges = [];
    for (let i = 0; i < h; i++) {
        var start = -1, end = -1;
        for (let j = 0; j < w; j++) {
            var isSweeper = map[i][j];
            if (!!!isSweeper) {
                if (start == -1) {
                    start = j;
                }
                end = j;
            } else if (start != -1 && end != -1) {
                temp.push([start, end]);
                start = -1;
                end = -1;
            }
        }
        if (start != -1 && end != -1) {
            temp.push([start, end]);
        }
        ranges.push(temp);
        temp = [];
    }

    return map;
}

function init() {
    w = Number(document.getElementById('w').value) || 18;
    h = Number(document.getElementById('h').value) || 18;
    gameOver = false;
    map = generateMap(w, h);
    marked = [];
    blocks = [...map];
    blocks.forEach((row, i) => {
        blocks[i] = row.map((block, j) => {
            var isSweeper = !!block;
            var nearbySweepers = 0;
            block = {};
            block.isSweeper = isSweeper;
            block.isRevealed = false;
            block.isMarked = false;
            // (j, i) -> (x, y)
            for (let a = (j < 1 ? 0 : j - 1); a < (j > w - 3 ? w : j + 2); a++) {
                // a -> x
                for (let b = (i < 1 ? 0 : i - 1); b < (i > h - 3 ? h : i + 2); b++) {
                    // b -> y
                    nearbySweepers += map[b][a] || 0;
                }
            }
            block.nearbySweepers = nearbySweepers - block.isSweeper;
            return block;
        })
    })
    document.getElementById('left-sweepers').innerText = String(sweeperCount).padStart(3, '0');
    update();
}

function canvasClarifier(canvas, ctx, width, height) {
    const originalSize = {
        width: (width ? width : canvas.offsetWidth),
        height: (height ? height : canvas.offsetHeight)
    }
    var ratio = window.devicePixelRatio || 1;
    canvas.width = originalSize.width * ratio;
    canvas.height = originalSize.height * ratio;
    ctx.scale(ratio, ratio);
    if (originalSize.width != canvas.offsetWidth || originalSize.height != canvas.offsetHeight) {
        canvas.style.width = originalSize.width + 'px';
        canvas.style.height = originalSize.height + 'px';
    }
}

function getPosition(element) {
    function offset(el) {
        var rect = el.getBoundingClientRect(),
            scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
            scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
    }
    return { x: offset(element).left, y: offset(element).top };
}

function pointToCoordinate(x, y) {
    var position = getPosition(canvas);
    return {
        x: ~~((x - position.x) / blockSize),
        y: ~~((y - position.y) / blockSize)
    }
}

function drawBlocks() {
    blocks.forEach((row, y) => {
        row.forEach((block, x) => {
            var remainder = (x + y) % 2;
            ctx.save();
            ctx.fillStyle = block.isRevealed ? (block.isSweeper ? 'red' : colors.revealed[remainder]) : colors.original[remainder];
            ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
            ctx.restore();
            if (block.isRevealed) {
                ctx.textAlign = 'center'
                if (block.isSweeper) {
                    ctx.fillStyle = 'black';
                    ctx.font = '24px Arial';
                    ctx.fillText('*', x * blockSize + blockSize / 2, y * blockSize + blockSize / 2 + 8);
                } else if (block.nearbySweepers != 0) {
                    ctx.fillStyle = 'black';
                    ctx.font = '24px Arial';
                    ctx.fillText(block.nearbySweepers, x * blockSize + blockSize / 2, y * blockSize + blockSize / 2 + 8);
                }
            } else if (block.isMarked) {
                ctx.save();
                ctx.fillStyle = 'red';
                ctx.translate(x * blockSize + blockSize / 2 - flagSize / 2, y * blockSize + blockSize / 2 - flagSize / 2);
                ctx.fill(flagPath);
                ctx.restore();
            }
        })
    })
}

function update() {
    canvasClarifier(canvas, ctx, w * blockSize, h * blockSize);
    drawBlocks();
    document.getElementById('left-sweepers').innerText = String(sweeperCount - marked.length).padStart(3, '0');
    if (revealedCount == w * h - sweeperCount) {
        alert('You won!');
        gameOver = true;
    }
}

function openBlock(x, y) {
    var block = blocks[y][x];
    if (!block) return;
    if (!block.isSweeper && !block.isRevealed) {
        revealedCount++;
        block.isRevealed = true;
        block.isMarked = false;
        marked = marked.filter(m => m[0] != x || m[1] != y);
        if (block.nearbySweepers == 0) {
            for (let yOffset = -1; yOffset <= 1; yOffset++) {
                for (let xOffset = -1; xOffset <= 1; xOffset++) {
                    if (
                        x + xOffset > -1 && x + xOffset < w &&
                        y + yOffset > -1 && y + yOffset < h
                    ) {
                        if (blocks[y + yOffset][x + xOffset].isSweeper) return;
                        openBlock(x + xOffset, y + yOffset);
                    }
                }
            }
        }
    }
}

function markBlock(x, y) {
    var block = blocks[y][x];
    if (!block) return;
    if (!block.isRevealed) {
        if (!block.isMarked) {
            if (marked.length + 1 > sweeperCount) return;
            marked = marked.filter(m => m[0] != x || m[1] != y);
            marked.push([x, y])
        } else {
            marked = marked.filter(m => m[0] != x || m[1] != y);
        }
        block.isMarked = !block.isMarked;
    }
    update();
}

function revealBlock(x, y) {
    var block = blocks[y][x];
    if (!block) return;
    if (block.isSweeper) {
        alert('You lost!');
        gameOver = true;
        blocks.forEach((row, i) => {
            row.forEach((block, j) => {
                block.isRevealed = true;
            })
        })
    } else {
        openBlock(x, y);
    }
    update();
}

canvas.addEventListener('mousedown', (e) => {
    const { x, y } = pointToCoordinate(e.pageX, e.pageY);
    if (!blocks[y]) return;
    if (blocks[y][x] && gameOver != true) {
        e.preventDefault();
        e.stopPropagation();
        if (e.button == 0) {
            revealBlock(x, y);
        } else if (e.button == 2) {
            markBlock(x, y);
        }
    }
})

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
})

document.getElementById('start').addEventListener('click', init);
document.getElementById('w').value = w;
document.getElementById('h').value = h;

init();