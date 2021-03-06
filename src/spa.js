/**
 * This file controls the page elements to achieve the effect of a single page application (SPA).
 * There are two types of page elements:
 *     float: Floating elements can coexist on a page.
 *     jump:  Jump will clear other elements on the page.
 * Four types of callback events:
 *     load: when loading to the page
 *     unload: when unloading from the page
 *     overlap: When a floating element covers the current element
 *     unoverlap: When the covered floating element is removed
 * To facilitate the page change of anchor elements, you can change window.location.hash to change page.
 * Special hash: __pop, which removes the last floating type page element.
 */
import {asyncLoadResByUrl} from "./loadResources.js";
let allPage = {}, nowPageRoute = [];
const spa = {
    addPage(id, content, type = "float") {
        if (id in allPage)
            throw `SPA: The page with ID ${id} already exists.`;
        function onAClick(e) {
            let href = this.getAttribute("href").trim();
            if (href[0] !== '#') return true;
            href = href.replace("#", "");
            if (allPage[href] && allPage[href].type === "jump")
                return true;
            if (href == "__pop") spa.back();
            else spa.openPage(href);
            return false;
        }
        allPage[id] = {
            get page() {
                let page = document.createElement("div");
                page.id = id;
                page.innerHTML = content;
                for (let a of page.getElementsByTagName("a"))
                    a.onclick = onAClick;
                return page;
            }, type,
            callback: { load:[], unload:[], overlap:[], unoverlap:[], },
        };
        return this;
    },

    addEventListener(id, eventType, callback = (nextPageId) => {}) {
        const p = allPage[id];
        if (!p) throw `SPA: The page with ID ${id} does not exist.`;
        if (p.callback[eventType]) p.callback[eventType].push(callback);
        else p.callback[eventType] = [callback];
    },
    targetEvent(id, eventType, ...args) {
        const p = allPage[id];
        if (!p) throw `SPA: The page with ID ${id} does not exist.`;
        if (p.callback[eventType])
            return p.callback[eventType].map(cb => cb(...args));
    },

    // data: The data that needs to be passed when the callback function of other page elements is triggered.
    openPage(nextID = "", data = {}) {
        if (!nextID) return;
        const nextPage = allPage[nextID];
        if (!nextPage) throw `SPA: The page with ID ${nextID} does not exist.`;
        const routeLen = nowPageRoute.length,
              nowID = nowPageRoute[routeLen - 1];
        if (nowID === nextID) return this;
        const lastID = (routeLen > 1
                       ? nowPageRoute[routeLen - 2]
                       : "");
        //float -> last jump/float   pop
        if (nextID === lastID) {
            spa.targetEvent(nowID, "unload", nextID, data);
            document.body.removeChild(document.body.lastChild);
            nowPageRoute.reduceRight((_, id) => spa.targetEvent(id, "unoverlap", nowID, data));
            nowPageRoute.pop();
        }
        //jump/float -> new float   push
        else if (nextPage.type === "float") {
            if (nowID) spa.targetEvent(nowID, "overlap", nextID, data);
            document.body.appendChild(nextPage.page);
            window.setTimeout(e => {
                nowPageRoute.push(nextID);
                nextPage.callback.load.forEach(f => f(nowID, data));
            }, 50);
        }
        //jump/float -> new jump   new empty
        else if (nextPage.type === "jump") {
            nowPageRoute.reverse();
            nowPageRoute.forEach(ID => {
                if (ID in allPage)
                    spa.targetEvent(ID, "unload", nextID, data);
            });
            document.body.innerHTML = "";
            document.body.appendChild(nextPage.page);
            nowPageRoute = [nextID];
            nextPage.callback.load.forEach(f => f(nowID, data));
        }

        if (nextPage.type === "jump" && window.location.hash !== "#" + nextID) {
            if (window.location.hash) window.location.hash = "#" + nextID;
            else window.history.replaceState(null, null, "#" + nextID);
        }
    },

    back() {
        if (nowPageRoute.length < 2) return;
        this.openPage(nowPageRoute[nowPageRoute.length - 2]);
    },

    async addPageByURL(url, type, id = "") {
        const getFileNameNoExt = _ => url.match(/([^<>/\\\|:""\*\?]+)\.(\w+$)/)[1];
        let content = await asyncLoadResByUrl(url);
        spa.addPage(id || getFileNameNoExt(), content, type);
    },

    async addPageByDefault() {
        let config = await asyncLoadResByUrl("src/spaDefaultLoad.json");
        for (let id in config) {
            this.addPageByURL(config[id].filePath, config[id].pageType, id).then(_ => {
                if (config[id].include)
                    import(config[id].include);
            });
        }
    },
};

window.location.hash = "";
window.addEventListener("hashchange", _ => {
    const id = window.location.hash.replace("#", "");
    if (id == "__pop") spa.back();
    else spa.openPage(id);
});

export {
    spa, spa as default,
}
