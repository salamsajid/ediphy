import {combineReducers} from 'redux';
import undoable, {excludeAction} from 'redux-undo';

import {ADD_BOX, SELECT_BOX, MOVE_BOX, RESIZE_BOX, UPDATE_BOX, DELETE_BOX, REORDER_BOX, ADD_SORTABLE_CONTAINER,
    ADD_NAV_ITEM, SELECT_NAV_ITEM, EXPAND_NAV_ITEM, REMOVE_NAV_ITEM,
    TOGGLE_PLUGIN_MODAL, TOGGLE_PAGE_MODAL, TOGGLE_TEXT_EDITOR, TOGGLE_TITLE_MODE,
    CHANGE_DISPLAY_MODE, SET_BUSY, UPDATE_TOOLBAR, IMPORT_STATE
} from './actions';
import {ID_PREFIX_SECTION, ID_PREFIX_PAGE, ID_PREFIX_SORTABLE_BOX, ID_PREFIX_SORTABLE_CONTAINER} from './constants';

function boxCreator(state = {}, action = {}){
    switch (action.type){
        case ADD_BOX:
            /*
            let styleStr = "min-width: '100px'; min-height: '100px'; background-color: 'yellow'".split(';');
            let style = {};
            styleStr.forEach(item =>{
                let keyValue = item.split(':');
                //We camelCase style keys
                let key = keyValue[0].trim().replace(/-./g,function(char){return char.toUpperCase()[1]});
                style[key] = keyValue[1].trim().replace(/'/g, "");
            });
            */
            let content = action.payload.content;
            if(!content)
                content = "<h1>Placeholder</h1>";

            let position, width, height;
            switch(action.payload.type){
                case 'sortable':
                    position = {x: 0, y: 0};
                    width = '100%';
                    break;
                default:
                    position = {x: Math.floor(Math.random() * 500), y: Math.floor(Math.random() * 500)}
                    width = 200;
                    height = 200;
                    break;
            }
            if(action.payload.ids.parent.indexOf(ID_PREFIX_SORTABLE_BOX) !== -1){
                position.y = 0;
            }
            
            return {
                id: action.payload.ids.id,
                children: [],
                parent: action.payload.ids.parent,
                type: action.payload.type,
                position: position,
                width: width,
                height: height,
                content: content,
                draggable: action.payload.draggable,
                resizable: action.payload.resizable,
                showTextEditor: action.payload.showTextEditor,
                fragment: {},
                sortableContainers: {}
            };
        default:
            return state;
    }
}

function sortableContainerCreator(state = {}, action = {}, box = {}){
    switch (action.type){
        case ADD_BOX:
            return Object.assign({}, state, {
                [action.payload.ids.container]: (state[action.payload.ids.container] ? {
                    children: [...state[action.payload.ids.container].children, action.payload.ids.id],
                    height: calculateNewSortableContainerHeight(state[action.payload.ids.container].height, box)
                } : {
                    children: [action.payload.ids.id],
                    height: calculateNewSortableContainerHeight(0, box)
                })
            });
        default:
            return state;
    }
}

function calculateNewSortableContainerHeight(actualHeight, box){
    let newHeight = box.position.y + box.height; //should be relative y position
    console.log(actualHeight + " " + newHeight);
    return (newHeight > actualHeight) ? newHeight : actualHeight;
}

function boxesById(state = {}, action = {}){
    switch (action.type){
        case ADD_BOX:
            let box = boxCreator(state[action.payload.ids.id], action);
            if(action.payload.ids.parent.indexOf(ID_PREFIX_PAGE) !== -1 || action.payload.ids.parent.indexOf(ID_PREFIX_SECTION) !== -1){
                return Object.assign({}, state, {
                    [action.payload.ids.id]: box
                });
            }
            return Object.assign({}, state, {
                [action.payload.ids.id]: box,
                [action.payload.ids.parent]: Object.assign({}, state[action.payload.ids.parent], {
                    children: (state[action.payload.ids.parent].children.indexOf(action.payload.ids.container) !== -1) ?
                        state[action.payload.ids.parent].children :
                        [...state[action.payload.ids.parent].children, action.payload.ids.container],
                    sortableContainers: sortableContainerCreator(state[action.payload.ids.parent].sortableContainers, action, box)
                })
            });
            return state;
        case MOVE_BOX:
            return Object.assign({}, state, {
                [action.payload.id]: Object.assign({}, state[action.payload.id], {position: {x: action.payload.x, y: action.payload.y}})
            });
        case RESIZE_BOX:
            return Object.assign({}, state, {
                [action.payload.id]: Object.assign({}, state[action.payload.id], {width: action.payload.width, height: action.payload.height})
            });
        case UPDATE_BOX:
            return Object.assign({}, state, {
                [action.payload.id]: Object.assign({}, state[action.payload.id], {content: action.payload.content})
            });
        case DELETE_BOX:
            var newState = Object.assign({},state);
            delete newState[action.payload.id];
            /*
            let newState = Object.assign({}, state);
            if(action.payload.parent.indexOf(ID_PREFIX_SORTABLE_CONTAINER) !== -1){
                if(newState[action.payload.parent].length === 1) {
                    delete newState[action.payload.parent];
                }else {
                    newState[action.payload.parent] = newState[action.payload.parent].filter(id => id !== action.payload.id);
                }
            }
            return newState;
            */
            /*
            var parent = state[action.payload.parent];
            console.log(parent);
             if (parent) {
                parent.children = parent.children.filter(id =>  id!=action.payload.id);
                newState = Object.assign({},newState, parent);
            }
            */
            return newState;
        case REORDER_BOX:
            let oldChildren = state[action.payload.parent].children
            var newChildren = Object.keys(oldChildren).map(i => oldChildren[action.payload.ids[i]])

            return Object.assign({}, state, {
                [action.payload.parent]: Object.assign({}, state[action.payload.parent], {children: newChildren}) });
        case IMPORT_STATE:
            return action.payload.present.boxesById;
        default:
            return state;
    }
}

function boxSelected(state = -1, action = {}) {
    switch (action.type) {
        case ADD_BOX:
            return action.payload.ids.id;
        case SELECT_BOX:
            return action.payload.id;
        case DELETE_BOX:
            return -1;
        case IMPORT_STATE:
            return action.payload.present.boxSelected;
        default:
            return state;
    }
}

function boxesIds(state = [], action = {}){
    switch (action.type){
        case ADD_BOX:
            return [...state, action.payload.ids.id];
        case DELETE_BOX:
            return  state.filter(id => id!=action.payload.id);
        case IMPORT_STATE:
            return action.payload.present.boxes;
        default:
            return state;
    }
}

function navItemCreator(state = {}, action = {}){
    switch (action.type){
        case ADD_NAV_ITEM:
            return {id: action.payload.id,
                name: action.payload.name,
                isExpanded: true,
                parent: action.payload.parent,
                children: action.payload.children,
                boxes: [],
                level: action.payload.level,
                type: action.payload.type,
                titlesReduced: action.payload.titlesReduced
            };
        default:
            return state;
    }
}

function recalculateNames(state = {},old = {}){
    var items = state

    var pageNum = 1;
    var sectionNum = 0
    var level = 0
    let deleted = items[old.id]
  
    for (let i in items){
       
        if (items[i].type !='section' &&  items[i].type !='' ){
            items[i].name = 'Page '+pageNum++
        }
       /* if (items[i].type =='section' ){
            items[i].name = 'Section '+sectionNum++
        }*/
    }


    return items
}

function navItemsIds(state = [], action = {}){
    switch(action.type){
        case ADD_NAV_ITEM:
            let nState = state.slice();
            nState.splice(action.payload.position, 0, action.payload.id);
            return nState;
        case REMOVE_NAV_ITEM:
            let newState = state.slice();
            action.payload.ids.forEach(id =>{
                newState.splice(newState.indexOf(id), 1);
            });
            return newState;
        case IMPORT_STATE:
            return action.payload.present.navItemsIds;
        default:
            return state;
    }
}

function navItemsById(state = {}, action = {}){
    switch(action.type){
        case ADD_NAV_ITEM:
            return Object.assign({}, state, {
                [action.payload.id]: navItemCreator(state[action.payload.id], action),
                [action.payload.parent]: Object.assign({}, state[action.payload.parent], {children: [...state[action.payload.parent].children, action.payload.id]})
            });
        case EXPAND_NAV_ITEM:
            return Object.assign({}, state, {[action.payload.id]: Object.assign({}, state[action.payload.id], {isExpanded: action.payload.value})});
        case TOGGLE_TITLE_MODE:
            return Object.assign({}, state, {[action.payload.id]: Object.assign({}, state[action.payload.id], {titlesReduced: action.payload.value})});
        case REMOVE_NAV_ITEM:
            let oldOne = Object.assign({},state[action.payload.ids[0]])
            let newState = Object.assign({}, state);
            action.payload.ids.map(id =>{
                delete newState[id];
            });
            let newChildren = newState[action.payload.parent].children.slice();
            newChildren.splice(newChildren.indexOf(action.payload.ids[0]), 1);
            let wrongNames = Object.assign({}, newState, {[action.payload.parent]: Object.assign({}, newState[action.payload.parent], {children: newChildren})});
            return recalculateNames(wrongNames, oldOne)
        case ADD_BOX:
            if(action.payload.ids.parent.indexOf(ID_PREFIX_PAGE) !== -1 || action.payload.ids.parent.indexOf(ID_PREFIX_SECTION) !== -1)
                return Object.assign({}, state, {
                    [action.payload.ids.parent]: Object.assign({}, state[action.payload.ids.parent], {
                        boxes: [...state[action.payload.ids.parent].boxes, action.payload.ids.id]})});
            return state
        case DELETE_BOX:
           
            if (action.payload.parent.indexOf(ID_PREFIX_PAGE) !== -1 || action.payload.parent.indexOf(ID_PREFIX_SECTION) !== -1){ 
                let currentBoxes = state[action.payload.parent].boxes;    
                var newBoxes =  currentBoxes.filter(id => id!=action.payload.id);
                if(action.payload.parent !== 0 ){
                    return Object.assign({}, state, {
                        [action.payload.parent]: Object.assign({}, state[action.payload.parent], {
                            boxes: newBoxes})});
                }
            }
            return state;
              
        case IMPORT_STATE:
            return action.payload.present.navItemsById;
        default:
            return state;
    }
}

function navItemSelected(state = 0, action = {}){
    switch(action.type){
        case SELECT_NAV_ITEM:
            return action.payload.id;
        case ADD_NAV_ITEM:
            return action.payload.id;
        case REMOVE_NAV_ITEM:
            return 0;
        case IMPORT_STATE:
            return action.payload.present.navItemSelected;
        default:
            return state;
    }
}

function toolbarsById(state = {}, action = {}){
    switch(action.type) {
        case ADD_BOX:
            let toolbar = {id: action.payload.ids.id, buttons: action.payload.toolbar, config: action.payload.config, state: action.payload.state, showTextEditor: action.payload.showTextEditor};
            return Object.assign({}, state, {[action.payload.ids.id]: toolbar});
        case UPDATE_TOOLBAR:
            let newState = state[action.payload.caller].buttons.slice();
            newState[action.payload.index] = Object.assign({}, newState[action.payload.index], {value: action.payload.value});
            return Object.assign({}, state, {
                [action.payload.caller]: Object.assign({}, state[action.payload.caller], {buttons: newState})
            });
        case UPDATE_BOX:
            return Object.assign({}, state, {
                [action.payload.id]: Object.assign({}, state[action.payload.id], {state: action.payload.state})
            });
        case TOGGLE_TEXT_EDITOR:
            return Object.assign({}, state, {
                [action.payload.caller]: Object.assign({}, state[action.payload.caller], {showTextEditor: action.payload.value})
            });
        case IMPORT_STATE:
            return action.payload.present.toolbarsById;
        default:
            return state;
    }
}

function togglePluginModal(state = {caller: 0, container: 0, fromSortable: false}, action = {}){
    switch(action.type){
        case TOGGLE_PLUGIN_MODAL:
            return action.payload;
        case ADD_BOX:
            return {caller: 0, container: 0, fromSortable: false};
        case IMPORT_STATE:
            return action.payload.present.boxModalToggled;
        default:
            return state;
    }
}

function togglePageModal(state = {value: false, caller: 0}, action = {}){
    switch(action.type){
        case TOGGLE_PAGE_MODAL:
            return action.payload;
        case ADD_NAV_ITEM:
            return {value: false, caller: 0};
        case IMPORT_STATE:
            return action.payload.present.pageModalToggled;
        default:
            return state;
    }
}

function changeDisplayMode(state = "", action = {}){
    switch(action.type){
        case CHANGE_DISPLAY_MODE:
            return action.payload.mode;
        case IMPORT_STATE:
            return action.payload.present.displayMode;
        default:
            return state;
    }
}

function isBusy(state = "", action = {}){
    switch(action.type){
        case SET_BUSY:
            return action.payload.msg;
        case IMPORT_STATE:
            return action.payload.present.isBusy;
        default:
            return state;
    }
}

const GlobalState = undoable(combineReducers({
    boxModalToggled: togglePluginModal,
    pageModalToggled: togglePageModal,
    boxesById: boxesById, //{0: box0, 1: box1}
    boxSelected: boxSelected, //0
    boxes: boxesIds, //[0, 1]
    navItemsIds: navItemsIds, //[0, 1]
    navItemSelected: navItemSelected, // 0
    navItemsById: navItemsById, // {0: navItem0, 1: navItem1}
    displayMode: changeDisplayMode, //"list",
    toolbarsById: toolbarsById, // {0: toolbar0, 1: toolbar1}
    isBusy: isBusy
}), { filter: (action, currentState, previousState) => {
    if(action.type === EXPAND_NAV_ITEM)
        return false;
    else if(action.type === TOGGLE_PAGE_MODAL)
        return false;
    else if(action.type === TOGGLE_PLUGIN_MODAL)
        return false;
    else if(action.type === TOGGLE_TITLE_MODE)
        return false;
    else if(action.type === CHANGE_DISPLAY_MODE)
        return false;
    else if(action.type === SET_BUSY)
        return false;
    return currentState !== previousState; // only add to history if state changed
    }});

export default GlobalState;