/*******************************
 * Fruchtsaft Quote Aggregator *
 *                             *
 * © 2019 Mike Kühnapfel       *
 * <veyxos@gmail.com>          *
 *******************************/

const current = {
    category: undefined,
    codename: undefined,
    nsfw: parseInt(document.getElementById("nsfw").value)
}
const quoteHistory = []
const maxHistoryItems = 5
const query = new Map(window.location.search.length > 0 ? window.location.search.slice(1).split("&").map(it => it.split("=")) : [])

// INITIALIZATION
fetch("https://api.fruchtsaft.veyxos.de/categories").then(r => r.json()).then(j => {
    // SET CATEGORIES
    if (query.has("category") && j.find(it => it.id === query.get("category")) !== undefined) {
        current.category = query.get("category")
    } else {
        if (query.has("category")) fancyAlert("Kategorie nicht gefunden")
        current.category = j[Math.round(Math.random() * (j.length - 1))].id
    }
    const s = document.getElementById("category")
    s.childNodes.forEach(it => it.remove())
    j.forEach(it => {
        const o = document.createElement("option")
        o.value = it.id
        o.innerText = it.title
        if (current.category === it.id) o.setAttribute("selected", "")
        s.appendChild(o)
    })

    // GET QUOTE
    if (query.has("category") && query.get("category") === current.category && query.has("codename")) {
        createRequest("/quotes", {category: current.category, codename: query.get("codename")}).then(r => r.json()).then(j => {
            if (j.error && j.error !== 409) throw new Error(j.text)
            else if (j.error && j.error === 409) {
                console.error(j.text)
                fancyAlert("Zitat nicht gefunden", `<pre>${j.text}</pre>`)
                createRequest("/random/quote", {category: current.category, nsfw: current.nsfw}).then(r => r.json()).then(j => {
                    renderFirst(j)
                })
            } else {
                renderFirst(j)
            }
        }).catch(e => connectionProblem(e))
    } else {
        createRequest("/random/quote", {category: current.category, nsfw: current.nsfw}).then(r => r.json()).then(j => {
            renderFirst(j)
        }).catch(e => connectionProblem(e))
    }

}).catch(e => {
    connectionProblem(e)
    const s = document.getElementById("category")
    s.childNodes.forEach(it => it.remove())
    const o = document.createElement("option")
    o.value = "falied"
    o.innerText = "Failed"
    s.appendChild(o)
}).finally("Quote set")

// SET PUN
fetch("https://api.fruchtsaft.veyxos.de/random/pun").then(r => r.json()).then(p => {
    if (/&#x[\d|a-f]+;/ig.test(p.text)) {
        let r = p.text
        const arr = p.text.match(/&#x[\d|a-f]+;/ig )
        const map = new Map(arr.map(it => [it, String.fromCodePoint(parseInt(it.slice(3, -1), 16))]))
        map.forEach((val, key) => r = r.replace(new RegExp(key, "gi"), val))
        document.querySelector("#siteHeader a").title = r
    } else {
        document.querySelector("#siteHeader a").title = p.text
    }
    document.querySelector("#siteFooter h2").innerHTML = p.text
}).catch(e => console.error(e)).finally(console.log("Pun set"))

// --------

document.querySelector("#new").addEventListener("click", newQuote)
document.querySelector("#category").addEventListener("change", event => {
    current.category = event.srcElement.value
    deleteHistory()
    newQuote()
})
document.querySelector("#nsfw").addEventListener("change", event => {
    current.nsfw = parseInt(event.srcElement.value)
    const currently = document.querySelector("#quote").classList.contains("nsfw")
    if (current.nsfw === 0 && currently || current.nsfw === 2 && !currently) newQuote()
})

/**
 * Function that gets a new quote from the API and renders it
 */
function newQuote() {
    fetch("https://api.fruchtsaft.veyxos.de/random/quote", {
        method: "POST",
        body: JSON.stringify({
            category: current.category,
            nsfw: current.nsfw,
            not: quoteHistory
        }),
        headers: {
            "Content-Type": "application/json"
        }
    }).then(r => r.json()).then(j => render(j)).catch(e => {
        connectionProblem(e)
        console.error(e)
    }).finally(console.log("History:", quoteHistory))
}

/**
 * Function that creates a fance Alert and displays it
 * @param title {string} The title of the Alert
 * @param text {string?} The HTML that should be shown
 * @param additional {string?} Additional information
 */
function fancyAlert(title, text, additional) {
    const a = document.createElement("div")
    a.id = "alert"
    const t = document.createElement("h2")
    t.innerHTML = title
    a.appendChild(t)
    if (text) a.innerHTML += text
    if (additional) {
        const c = document.createElement("p")
        c.classList.add("additional")
        c.innerHTML = additional
        a.appendChild(c)
    }
    a.onclick = close
    document.body.appendChild(a)

    setTimeout(close, 5300)

    function close() {
        a.classList.add("close")
        setTimeout(() => {
            a.remove()
        }, 500)
    }
}

function connectionProblem(e) {
    console.error(e)
    fancyAlert(
        "Fehler beim Verbinden mit der Fruchtsaft API",
        `<pre>${e.toString()}</pre>`,
        `Sollte das Problem weiter bestehen bitte bei <a target="_blank" href="https://twitter.com/intent/tweet?text=Dein%20Schei%C3%9F%20funktioniert%20nicht%20%F0%9F%A4%AC&hashtags=fruchtsaft%2Cbug&via=veyxos">Twitter</a> melden.`
    )
}

/**
 * Creates a POST request for the Fruchtsaft API
 * @param url {string} path to connect to
 * @param body {object?} data to send
 * @returns {Promise} Fetch Promise
 */
function createRequest(url, body) {
    const init = {
        method: "POST"
    }
    if (body) {
        init.body = JSON.stringify(body)
        init.headers = {"Content-Type": "application/json"}
    }
    return fetch(`https://api.fruchtsaft.veyxos.de${url}`, init)
}

/**
 * Function which renders a quote
 * @param quote {{codename: string, text: string, author: string, date: {str: string}, nsfw: boolean}} Quote as JS Object
 */
function render(quote) {
    current.codename = quote.codename
    addToHistory(quote.codename)
    document.querySelector("#quote .content blockquote").innerHTML = quote.text.replace(/\n/g, "<br>")
    document.querySelector("#quote .content cite").innerHTML = `${quote.author}, ${quote.date.str}`
    if (document.querySelector("#quote").classList.contains("nsfw") && !quote.nsfw || !document.querySelector("#quote").classList.contains("nsfw") && quote.nsfw)
        document.querySelector("#quote").classList.toggle("nsfw")
    document.querySelector("#codename").innerText = quote.codename
}

/**
 * Function which creates all necessairy DOM elements and renders a quote
 * @param quote {{codename: string, text: string, author: string, date: {str: string}, nsfw: boolean}} Quote as JS Object
 * @see render
 */
function renderFirst(quote) {
    current.codename = quote.codename
    document.querySelector("#codename").innerText = current.codename
    document.querySelector("#quote .content .loading").remove()
    const bq = document.createElement("blockquote")
    bq.innerHTML = quote.text.replace(/\n/g, "<br>")
    const ct = document.createElement("cite")
    ct.innerHTML = `${quote.author}, ${quote.date.str}`
    document.querySelector("#quote .content").appendChild(bq)
    document.querySelector("#quote .content").appendChild(ct)
    if (quote.nsfw) document.querySelector("#quote").classList.add("nsfw")
    addToHistory(current.codename)
}

function addToHistory(codename) {
    quoteHistory.unshift(codename)
    if (quoteHistory.length > maxHistoryItems) quoteHistory.pop()
}
function deleteHistory() {
    const l = quoteHistory.length
    for (let i = 0; i < l; i++) {
        quoteHistory.pop()
    }
}
