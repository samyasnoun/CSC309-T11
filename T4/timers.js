/* global list of timers */
var timers = [];
var next_id = 1;

function update_stats() {
    let num_active_timers  = document.querySelector("#num_active_timers");
    let num_expired_timers = document.querySelector("#num_expired_timers");
    let avg_remain_time    = document.querySelector("#avg_remain_time");

    const counts = timers.reduce((acc, t) => {
        const r = Math.max(0, t.remaining);
        acc.total += 1;
        acc.sum   += r;
        if (r > 0) acc.active += 1; else acc.expired += 1;
        return acc;
    }, { total: 0, active: 0, expired: 0, sum: 0 });

    const avg_seconds = counts.total === 0 ? 0 : Math.ceil(counts.sum / counts.total);

    num_active_timers.textContent  = counts.active;
    num_expired_timers.textContent = counts.expired;
    avg_remain_time.textContent    = avg_seconds;
}

class Timer {
    constructor(minutes, seconds, update, remove) {
        this.id = next_id;
        next_id += 1;
        
        this.minutes = minutes;
        this.seconds = seconds;
        this.updateFn = update;
        this.removeFn = remove;

        this.remaining = minutes * 60 + seconds;

        // initial update
        this.updateDisplay();

        this.interval = setInterval(() => {
            if (this.remaining > 0) {
                this.remaining -= 1;
                this.updateDisplay();
            } else {
                clearInterval(this.interval);
            }
        }, 1000);
    }

    updateDisplay() {
        const m = Math.floor(this.remaining / 60);
        const s = this.remaining % 60;
        this.updateFn(m, s);
        update_stats();
    }

    remove() {
        clearInterval(this.interval);
        this.interval = null; 
        this.removeFn();
        timers = timers.filter(t => t.id !== this.id);
        update_stats();
    }
}

function create_timer(event, form)
{
    /* we don't actually want to submit a request */
    event.preventDefault();

    let name = form["name"].value.trim();
    let minutes = parseInt(form["minutes"].value);
    let seconds = parseInt(form["seconds"].value);
    let error = form.getElementsByClassName("error")[0];

    if (minutes < 0 || seconds < 0 || minutes * 60 + seconds <= 0) {
        error.innerHTML = "value must be greater than zero.";
        return false;
    }
    else {
        error.innerHTML = "";
    }

    let container = document.createElement("details");
    const new_id = next_id;
    const remove = (_e) => {
        timers = timers.filter((elem) => elem.id !== new_id);
        container.remove(); 
    };

    let timer = new Timer(
        minutes,
        seconds,
        (m, s) => {
            let minutes = Array.from(container.getElementsByClassName("minutes"));
            let seconds = Array.from(container.getElementsByClassName("seconds"));
            minutes.forEach((elem, _i) => { elem.innerHTML = m; });
            seconds.forEach((elem, _i) => { elem.innerHTML = String(s).padStart(2, "0"); });
        },
        remove
    );

    const seconds_padded = String(seconds).padStart(2, "0");
    container.innerHTML = `
        <summary>${name}<a href="#">&#x274c;</a></summary>
        <div>
        <span class="minutes">${minutes}</span>:<span class="seconds">${seconds_padded}</span>
        </div>
    `;
    container.setAttribute("open", "");
    let anchors = Array.from(container.getElementsByTagName("a"));
    anchors.forEach((elem, _i) => { elem.addEventListener("click", remove) });

    let main = document.getElementById("main");
    main.appendChild(container);
    timers.push(timer);

    return false;
}

function extend_all_timers(event, form) {
    /* we don't actually want to submit a request */
    event.preventDefault();
    let seconds = parseInt(form["seconds"].value);
    let error = form.getElementsByClassName("error")[0];
    if (seconds <= 0) {
        error.innerHTML = "value must be greater than zero.";
        return false;
    }
    else {
        error.innerHTML = "";
    }
    timers.forEach(t => {
        t.remaining = Math.max(0, (t.remaining | 0) + seconds);
        if (t.remaining > 0 && !t.interval) {
            t.interval = setInterval(() => {
                if (t.remaining > 0) {
                    t.remaining -= 1;
                    t.updateDisplay();
                } else {
                    clearInterval(t.interval);
                    t.interval = null;
                    t.updateDisplay();
                }
            }, 1000);
        }
        t.updateDisplay();
    });
    return false;
}

function clear_expired_timers(event) {
    event.preventDefault();
     timers.filter(t => t.remaining <= 0).forEach(t => t.remove());
}