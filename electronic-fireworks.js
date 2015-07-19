var g = 1e-4;
var zoom = { val: 3e2, coef: 1-1e-4 };
var mass = { min: 1, max: 5 };
var count = 100;
var fireworks = { prob: 0.1, count: 10, range: 1e-1 };
var death = { prop: 1e-10, min: count, fireworksIfMin: true };
var bounce = 0;
var colors = [ "#3cf", "#3fc", "#c3f", "#cf3", "#f3c", "#fc3" ];
var background = "rgba(0, 0, 0, .05)";
var dt = 1000 / 30;
var epsilon = 1e-8;
var perf = [ 200, 50 ];

function step(u0, dt) {
    var ut = [];
    for (var i1 in u0) {
        var p1 = u0[i1];
        ut.push([
            p1[0],
            p1[1],
            p1[2] || 0,
            p1[3] || 0
        ]);
        var p1t = ut[i1];
        p1t.color = p1.color || colors[i1 % colors.length];
        p1t.mass = p1.mass || mass.min + (mass.max - mass.min) * Math.random();
    }
    for (var i1 in u0) {
        var p1 = u0[i1];
        var p1t = ut[i1];
        for (var i2 in u0) {
            if (i2 <= i1)
                continue;
            var p2 = u0[i2];
            var p2t = ut[i2];
            var vp = [
                p2[0] - p1[0],
                p2[1] - p1[1]
            ];
            var n2 = vp[0] * vp[0] + vp[1] * vp[1];
            if (n2 === 0)
                throw new Error("Two particles at the same position: [" + p1 + "], [" + p2 + "]");
            var n = Math.sqrt(n2);
            var f = g * p1t.mass * p2t.mass / n2;
            var vf = [
                dt * f * (vp[0] / n),
                dt * f * (vp[1] / n)
            ];
            p1t[2] -= vf[0] / p1t.mass;
            p1t[3] -= vf[1] / p1t.mass;
            p2t[2] += vf[0] / p2t.mass;
            p2t[3] += vf[1] / p2t.mass;
        }
        p1t[0] += dt * p1t[2];
        p1t[1] += dt * p1t[3];
        if (bounce) {
            var a = [
                Math.abs(p1t[0]),
                Math.abs(p1t[1])
            ];
            if (a[0] > 1) {
                p1t[2] *= -bounce;
                p1t[0] /= a[0];
                p1t[0] += p1t[2] * epsilon;
            }
            if (a[1] > 1) {
                p1t[3] *= -bounce;
                p1t[1] /= a[1];
                p1t[1] += p1t[3] * epsilon;
            }
        }
    }
    return ut;
}

function drawCanvas(u, canvas, dta, fps) {
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var i in u) {
        var p = u[i];
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(
            canvas.width / 2 + zoom.val * p[0],
            canvas.height / 2 + zoom.val * p[1],
            p.mass * zoom.val / 300, //Math.pow(p.mass / (4/3 * Math.PI), 1/3),
            0,
            2 * Math.PI
        );
        ctx.fill();
    }
    if (bounce) {
        ctx.strokeStyle = "white";
        ctx.strokeRect(
            canvas.width / 2 - zoom.val - mass.min,
            canvas.height / 2 - zoom.val - mass.min,
            2 * zoom.val + 2 * mass.min,
            2 * zoom.val + 2 * mass.min
        );
    }
    if (perf[0]) {
        var dtal = perf[0];
        var gh = perf[1];
        var padding = gh * 0.2;
        ctx.fillStyle = "black";
        ctx.fillRect(canvas.width - dtal - padding, canvas.height - gh - padding, dtal, gh);
        ctx.fillStyle = "brown";
        ctx.fillRect(canvas.width - dtal - padding, canvas.height - gh / 2 - padding, dtal, 1);
        ctx.beginPath();
        for (var i in dta)
            ctx.lineTo(canvas.width - i - padding, canvas.height - Math.min(gh * 0.95, gh / 2 * dt / dta[i]) - padding);
        ctx.strokeStyle = dta[dta.length - 1] > dt ? "red" : "green";
        ctx.stroke();
        ctx.strokeStyle = "white";
        ctx.strokeText("Physics: " + dta[dta.length - 1] + " ms", canvas.width - 130 - padding, canvas.height - 10 - padding);
        ctx.strokeText("FPS: " + fps, canvas.width - 40 - padding, canvas.height - 10 - padding);
        ctx.strokeRect(canvas.width - dtal - padding, canvas.height - gh * 1.01 - padding, dtal, gh);
    }
    zoom.val *= zoom.coef;
}

function spawn(u, n) {
    for (var i = 0; i < n; ++i) {
        u.push([
            Math.random() - .5,
            Math.random() - .5
        ]);
    }
}

function createCanvas() {
    var canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    function resize() {
        canvas.width = document.body.parentElement.clientWidth;
        canvas.height = document.body.parentElement.clientHeight;
    }
    resize();
    window.onresize = resize;
    return canvas;
}

function pickOne(u) {
    return u[Math.random() * u.length | 0];
}

function spawnFireworks(u) {
    var p0 = pickOne(u);
    for (var i = 0; i < fireworks.count; ++i) {
        u.push([
            p0[0] + fireworks.range * (Math.random() + epsilon),
            p0[1] + fireworks.range * (Math.random() + epsilon)
        ]);
    }
}

function killSome(u) {
    if (u.length > death.min)
        for (var i = 0; i < u.length * death.prop; ++i)
            u.shift();
    else if (death.fireworksIfMin)
        spawnFireworks(u);
}

function stepAddons(u) {
    if (Math.random() < fireworks.prob)
        spawnFireworks(u);
    killSome(u);
}

(function() {
    var canvas = createCanvas();
    var u = [];
    spawn(u, count);
    var timer = new Date();
    var dts = 0;
    var dta = [];
    var updated = false;
    setInterval(function update() {
        var newTimer = new Date();
        var dti = newTimer - timer;
        dts += dti;
        timer = newTimer;
        if (updated) {
            dta.push(dti);
            if (dta.length > perf[0])
                dta.shift();
        }
        if ((updated = dts > 0)) {
            stepAddons(u);
            u = step(u, dt / 1000);
            dts -= dt;
        }
    }, 0);
    var frames = [];
    requestAnimationFrame(function draw() {
        drawCanvas(u, canvas, dta, frames.length);
        frames.push(new Date());
        while (frames[frames.length - 1] - frames[0] > 1000)
            frames.shift();
        requestAnimationFrame(draw);
    });
})();
