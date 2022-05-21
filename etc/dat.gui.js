import * as dat from 'dat.gui';
//import 'dat.gui.css';
/*
 * overload dat.GUI library to enable tooltip
 */
function setTitle (v) {
    // __li is the root dom element of each controller
    if (v) {
        this.__li.setAttribute('title', v);
    } else {
        this.__li.removeAttribute('title')
    }

    return this;
}

/**
 * overload dat.GUI library to add command strip where all commands are in a row
 * @param {String} faName
 * @param {"strip" | "dropdown"} [displayType='strip']
 * @param {object} attrs:  key-value pairs for additional attributes of the icon to be added
 */
function setCommandIcon(faName,displayType='strip',attrs={}) {
    // __li is the root dom element of each controller
    this.__li.classList.add("neu3dbutton",'tooltip');



    if (faName) {
        this.__li.setAttribute('icon', faName);
        let faicon;
        let faiconHTML;
        if (!(faName in customFA)){
            faicon = document.createElement('i');
            faicon.setAttribute("class", faName);
            if (!(Object.keys(attrs).length === 0 && attrs.constructor === Object)) {
                for (let key in attrs) {
                    faicon.setAttribute(key, attrs[key]);
                }
            }
            faiconHTML = faicon.outerHTML;
        }else{
            faiconHTML = customFA[faName];
        }

        if (displayType == 'strip'){
            this.__li.innerHTML = '';
            this.__li.style['display'] = 'inline';
            this.__li.style['border'] = 'none';
            this.__li.innerHTML = faiconHTML;
        } else if (displayType == 'dropdown'){
            this.__li.childNodes[0].innerHTML = faiconHTML + this.__li.childNodes[0].innerHTML;
        } else{
            this.__li.childNodes[0].innerHTML = faiconHTML + this.__li.childNodes[0].innerHTML;
            console.warn("display Type = " + displayType+ " not recognized, default to `dropdown`");
        }

    } else {
        this.__li.style['display'] = '';
        this.__li.removeAttribute('icon');
    }
    return this;
}

function eachController(fnc) {
    for (let controllerName in dat.controllers) {
        if (Object.prototype.hasOwnProperty.call(dat.controllers, controllerName)) {
            fnc(dat.controllers[controllerName]);
        }
    }
}

// Add title, icon methods to controllers
eachController(controller => {
    if (!Object.prototype.hasOwnProperty.call(controller.prototype, 'title')) {
        controller.prototype.title = setTitle;
    }
    if (!Object.prototype.hasOwnProperty.call(controller.prototype, 'icon')) {
        controller.prototype.icon = setCommandIcon;
    }
});

const customFA = {
    'fa fa-map-upin': '<span class="fa-layers fa-fw" ><i class= "fas fa-map-pin"></i><i class="fa-inverse fas fa-times" data-fa-transform="shrink-5 right-3 down-5" style="color:red"></i></span>'
}

export default dat;