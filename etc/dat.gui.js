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
};

/**
 * overload dat.GUI library to add command strip where all commands are in a row
 * @param {String} faName
 * @param {"strip" | "dropdown"} [displayType='strip']
 * @param {object} attrs:  key-value pairs for additional attributes of the icon to be added
 */
function setCommandIcon(faName,displayType='strip',attrs={}) {
    // __li is the root dom element of each controller
    if (faName) {
        this.__li.setAttribute('icon', faName);

        let faicon = document.createElement('i');
        faicon.setAttribute("class", faName);
        if (!(Object.keys(attrs).length === 0 && attrs.constructor === Object)){
            for (let key in attrs) {
                faicon.setAttribute(key, attrs[key]);
            }    
        }

        if (displayType == 'strip'){
            this.__li.innerHTML = '';
            this.__li.style['display'] = 'inline';
            this.__li.style['border'] = 'none';
            this.__li.prepend(faicon);
        } else if (displayType == 'dropdown'){
            this.__li.childNodes[0].prepend(faicon);
        } else{
            this.__li.childNodes[0].prepend(faicon);
            console.warn("display Type = " + displayType+ " not recognized, default to `dropdown`");
        }
        
    } else {
        this.__li.style['display'] = '';
        this.__li.removeAttribute('icon');
    }
    return this;
}

function eachController(fnc) {
    for (var controllerName in dat.controllers) {
        if (dat.controllers.hasOwnProperty(controllerName)) {
            fnc(dat.controllers[controllerName]);
        }
    }
}

eachController(controller => {
    if (!controller.prototype.hasOwnProperty('title')) {
        controller.prototype.title = setTitle;
    }
});


eachController(controller => {
    if (!controller.prototype.hasOwnProperty('icon')) {
        controller.prototype.icon = setCommandIcon;
    }
});

export default dat;