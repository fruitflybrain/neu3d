let PropertyManagerHandler = {
    set: function(obj, prop, value) {
        if (prop.includes('_PropMan_')) {
            obj[prop] = value;
            return true;
        }
        try {
            if (!Object.getOwnPropertyDescriptor(obj, prop).writable) {
                console.error("Can't set the value for " + prop + " in PropertyManager");
                return false;
            }
        } catch (e) {
            // do nothing
        }

        if (prop in obj._PropMan_validations) {
            if (!(obj._PropMan_validations[prop].reduce(function(a, b) {
                return a && b(value);
                }, true)))
                return false;
        }

        try {
            if (Object.prototype.hasOwnProperty.call(value, '_PropMan')) {
                if (value._PropMan_parent === undefined) {
                    value._PropMan_parent = {
                        'prop': prop,
                        'obj': obj
                    };
                }
            }
        } catch (err) {
            // do nothing
        }


        if (prop in obj) {
            if (obj[prop] != value) {
                let old_value = obj[prop];
                obj[prop] = value;
                obj._PropMan_propogate_event({
                    'prop': prop,
                    'event': 'change',
                    'value': value,
                    'path': [],
                    'old_value': old_value,
                    'obj': obj
                });
            } else {
                return true;
            }
        } else { //add callback (not propogated to parents)
            obj[prop] = value;
            obj._PropMan_callbacks._add_any.forEach(function(f) {
                try {
                    f({
                        'event': 'add',
                        'prop': prop,
                        'value': value
                    });
                } catch (err) {
                    console.error(`[Neu3D-PropMan] Error, ${err}`);
                }
            });
            if (prop in obj._PropMan_callbacks)
                obj._PropMan_callbacks[prop].add.forEach(function(f) {
                    try {
                        f({
                            'event': 'add',
                            'prop': prop,
                            'value': value
                        });
                    } catch (err) {
                        console.error(`[Neu3D-PropMan] Error, ${err}`);
                    }
                });
        }
        return true;

    },

    deleteProperty: function(obj, prop) {
        obj._PropMan_callbacks._remove_any.forEach(function(f) {
            try {
                f({
                    'event': 'remove',
                    'prop': prop,
                    'value': obj[prop]
                });
            } catch (err) {
                console.error(`[Neu3D-PropMan] Error, ${err}`);
            }
        });
        if (prop in obj._PropMan_callbacks) {
            obj._PropMan_callbacks[prop].remove.forEach(function(f) {
                try {
                    f({
                        'event': 'remove',
                        'prop': prop,
                        'value': obj[prop]
                    });
                } catch (err) {
                    console.error(`[Neu3D-PropMan] Error, ${err}`);
                }
            });
        }

        try {
            if (Object.prototype.hasOwnProperty.call(obj[prop], '_PropMan')) {
                if (obj[prop]._PropMan_parent !== undefined) {
                    obj[prop]._PropMan_parent = undefined;
                }
            }
        } catch (err) {
            // do nothing
        }
        delete obj[prop];
        return true;
    },

    has: function(obj, prop) {
        if (prop.includes('_PropMan_')) {
            return false;
        }
        return prop in obj;
    },
};


export class PropertyManager {
    constructor(map = {}) {
        // if (map == undefined) map = {};
        Object.defineProperty(map, '_PropMan_callbacks', {
            value: {
                _add_any: [],
                _remove_any: []
            },
            enumerable: false
        });
        Object.defineProperty(map, '_PropMan_parent', {
            value: undefined,
            enumerable: false,
            writable: true
        });
        Object.defineProperty(map, '_PropMan', {
            value: true,
            enumerable: false,
            writable: false,
            configurable: false
        });
        Object.defineProperty(map, '_PropMan_validations', {
            value: {},
            enumerable: false
        });
        Object.defineProperty(map, 'on', {
            value: function(event, callback, prop) {
                if (['add', 'remove', 'change'].indexOf(event) < 0) {
                    console.error(`[Neu3D-PropMan] Event type not understood`);
                    return false;
                }
                if (!(callback instanceof Function)) {
                    console.error(`[Neu3D-PropMan] CallBack should be a function`);
                    return false;
                }

                if (prop == undefined) {
                    if (event == 'change') {
                        console.error(`[Neu3D-PropMan] Change event can only have callbacks for specific properties`);
                        return false;
                    }
                    event = ({
                        add: '_add_any',
                        remove: '_remove_any'
                    })[event];
                    this._PropMan_callbacks[event].push(callback);
                } else {
                    if (!(prop instanceof Array))
                        prop = Array(prop);
                    prop.forEach(function(p) {
                        if (!(p in this._PropMan_callbacks))
                            this._PropMan_callbacks[p] = {
                                'change': [],
                                'add': [],
                                'remove': []
                            };
                        this._PropMan_callbacks[p][event].push(callback);
                    }.bind(this));
                }
            },
            configurable: false,
            writable: false,
            enumerable: false
        });

        Object.defineProperty(map, 'add_validation', {
            value: function(prop, validator) {
                if (!(validator instanceof Function)) {
                    console.error(`[Neu3D-PropMan] Validator should be a function`);
                    return false;
                }
                if (!(prop in this._PropMan_validations))
                    this._PropMan_validations[prop] = [];
                this._PropMan_validations[prop].push(validator);
                return true;
            },
            enumerable: false,
            writable: false,
            configurable: false
        });

        Object.defineProperty(map, '_PropMan_propogate_event', {
            value: function(e) {
                if (e['prop'] in this._PropMan_callbacks)
                    this._PropMan_callbacks[e['prop']]['change'].forEach(function(f) {
                        try {
                            f(e);
                        } catch (err) {
                            console.error(`[Neu3D-PropMan] Error, ${err}`);
                        }
                    });
                if (this._PropMan_parent !== undefined) {
                    e.path.push(this._PropMan_parent['prop']);
                    this._PropMan_parent['obj']._PropMan_propogate_event(e);
                }
            },
            enumerable: false,
            writable: false,
            configurable: false
        });

        return new Proxy(map, PropertyManagerHandler);
    }
}

// function PropertyManager(map){
//   if(map == undefined) map = {};
//   Object.defineProperty(map, '_PropMan_callbacks', {value: {_add_any: [], _remove_any: []}, enumerable: false});
//   Object.defineProperty(map, '_PropMan_parent', {value: undefined, enumerable: false, writable: true});
//   Object.defineProperty(map, '_PropMan', {value: true, enumerable: false, writable: false, configurable: false});
//   Object.defineProperty(map, '_PropMan_validations', {value: {}, enumerable: false});
//   Object.defineProperty(map, 'on', {
//     value: function(event, callback, prop){
//       if(['add', 'remove', 'change'].indexOf(event) < 0){
//         console.error('Event type not understood');
//         return false;
//       }
//       if(! (callback instanceof Function) ){
//         console.error('CallBack should be a function');
//         return false;
//       }

//       if(prop == undefined){
//         if(event == 'change'){
//           console.error('Change event can only have callbacks for specific properties');
//           return false;
//         }
//         event = ({ add: '_add_any', remove: '_remove_any' })[event]
//         this._PropMan_callbacks[event].push(callback);
//       }
//       else{
//         if ( !(prop instanceof Array) )
//           prop = Array(prop);
//         prop.forEach(function(p) {
//           if( !(p in this._PropMan_callbacks) )
//             this._PropMan_callbacks[p] = {'change': [],
//                                           'add': [],
//                                           'remove': [] };
//           this._PropMan_callbacks[p][event].push(callback);
//         }.bind(this));
//       }
//     },
//     configurable: false,
//     writable: false,
//     enumerable: false});

//   Object.defineProperty(map, 'add_validation', {
//     value: function(prop, validator){
//       if(! (validator instanceof Function) ){
//         console.error('Validator should be a function');
//         return false;
//       }
//       if( !(prop in this._PropMan_validations) )
//         this._PropMan_validations[prop] = []
//       this._PropMan_validations[prop].push(validator);
//       return true;
//     },
//     enumerable: false,
//     writable: false,
//     configurable: false});

//   Object.defineProperty(map, '_PropMan_propogate_event', {
//     value: function(e){
//       if(e['prop'] in this._PropMan_callbacks)
//         this._PropMan_callbacks[e['prop']]['change'].forEach(function(f){
//           try { f(e) }
//           catch(err) { console.error(`[Neu3D-PropMan] Error, ${err}`); }
//         });
//       if(this._PropMan_parent !== undefined){
//         e.path.push(this._PropMan_parent['prop']);
//         this._PropMan_parent['obj']._PropMan_propogate_event(e);
//       }
//     },
//     enumerable: false,
//     writable: false,
//     configurable: false});

//   return new Proxy(map, PropertyManagerHandler)
// }
