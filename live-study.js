window.onload = function() {
  const root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root)
  const testing = app(state, actions, view, root, true);
  // testing.log.config({state: false, vdom: false})
}

/* refactor  plann
  components for
    to study
    utility functions
    exercises
  main view
    like below and/but
    renders above 3 in order
  base components

  and use something to auto-generate docs
*/

const links_list = (resources) => {
  const links = [];
  for (let key in resources) {
    const next_link = h(
      "a", 
      { href: resources[key],
        target: "_blank"},
      key
    );
    const next_li = h("li", null, next_link);
    links.push(next_li);
  }
  return h("ul", null, ...links);
}

const table_of_contents = (exercises) => {
  const toc_obj = {};
  for (let index in exercises) {
    const this_one = exercises[index];
    toc_obj[this_one.name] = "#"+index;
  }
  
  const links = [];
  for (let key in toc_obj) {
    const next_link = h(
      "a", 
      { href: toc_obj[key]+"--"+key},
      key
    );
    const next_li = h("li", null, next_link);
    links.push(next_li);
  }

  return h("ol", null, ...links);
}

// refactor later for configurability
const html_div = (exercise) => {
  const rendered_html = document.createElement("div");
  rendered_html.id = exercise.id+"--html";
  rendered_html.innerHTML = exercise.HTML;

  return h("div", null,
      h("pre", {class:"prettyprint lang-html"}, exercise.HTML),
      h("button",
        {
          onclick: function() {
            const encoded = encodeURIComponent(exercise.HTML);
            const url = "https://software.hixie.ch/utilities/js/live-dom-viewer/?"+encoded;
            window.open(url, '_blank');
          }
        },
        "open in Live DOM Viewer" 
        ),
      h("br",null,null),
      h("div", 
        {style:"border-style:solid"},
        rendered_html
      ),
      h("br",null,null),
    )
}

const reload_button = (exercise) => {
  return h("button", 
            {
              onclick: function() {
                const body = function_body(exercise.code);
                exercise.editorDiv.editor.setValue(body);
              }
            },
            "reload challenge"
          )
}

const evaluate_button = (exercise, actions) => {
  return h(
          "button", 
          {
            onclick: function() {
              actions.evaluate(exercise.id)
            }
          },
          "evaluate code"
        )
}

const study_links = (exercise) => {

  const buttons = [];

  for (const tool of exercise.viztools) {
    const next_button = h("button",
        { onclick: function() {
            const snippet = exercise.editorDiv.editor.getValue();
            const url = generate_url(snippet, tool);
            window.open(url, '_blank');
          }
        },
        tool
      );
    buttons.push(next_button)
  }

  return h("div", null, "study snippet in: ", ...buttons);
}

const in_console_button = (exercise, actions) => {
    return h("button",
              {
                onclick: function() {
                  actions.copy_snippet(exercise.id);
                } 
              },
              "run in console"
            )
          
}

const dom_div = (exercise) => {

  const initial = exercise.dom;
  const initial_dom = typeof initial === "string" ? initial : null ;
  const container = document.createElement("div");
  container.id = exercise.name;
  container.innerHTML = initial_dom;  
  
  const reset_button = h("button", 
                          {
                            onclick: function() {
                              const exercise_div = document.getElementById(exercise.name)
                              exercise_div.innerHTML = initial_dom;
                            }
                          },
                          'reset exercise container, id === "'+exercise.name+'"'
                        )

  return h("div", null, 
          reset_button,  
          h("div", {style: "border-style:solid"},
            container
            )
          );
}

const divider = () => {
  return h( "div", null,
      h("br",null,null), 
      h("hr",null,null),
      h("a", {href:"#"}, "TOP"),
      h("hr",null,null)
    )
}

const live_exercises = (exercises, actions) => {
  const exercise_divs = [h("hr",null,null)];
  for (const index in exercises) {
    const exer = exercises[index];
    const html = exer.HTML ? html_div(exer) : null ;
    const resources = exer.resources ? links_list(exer.resources) : null ;
    const study_it = exer.viztools.length !== 0 ? study_links(exer) : null ;
    const dom = exer.dom ? dom_div(exer) : null ;
    const reload = reload_button(exer);

    const new_div = h(
      "div",
      {
        style: "background-color:"+exer.color, 
        id: exer.id+"--"+exer.name,
        oncreate: function() {
          exer.editorDiv.editor.resize();
          exer.editorDiv.editor.renderer.updateFull();
          actions.evaluate(exer.id)
        }
      },
      h("h3", null, exer.id+": "+exer.name),
      reload,
      h("pre", null, exer.specs),
      resources,
      html,
      dom,
      study_it,
      h("div", null,
        evaluate_button(exer, actions),
        in_console_button(exer, actions)
      ),
      exer.editorDiv,

    );
    exercise_divs.push( new_div, divider() );
  }
  return h("div", {id:"live exercises"}, ...exercise_divs);
}

const view = (state, actions) => {
  return h( "div", null,
      // header(),
      h("h1", null, state.title),
      h("pre", null, state.text),
      h("h3", null, "helpful resources"),
      links_list(state.resources),
      h("h3", null, "exercises"),
      table_of_contents(state.exercises),
      live_exercises(state.exercises, actions),
      // footer()
    )
}

const actions = {

  evaluate: id => (state, actions) => { 

    const exercise = state.exercises[id];

    const new_body = "return function exercise_"+exercise.id+"(console){ "+exercise.editorDiv.editor.getValue()+" }";
    const prevaluate = new Function(new_body);
    const to_evaluate = prevaluate();
  
    const evaluation_console = Object.create(console);

    actions.update_exercise({id: exercise.id, key: "color", value: ""});

    function closing_assert(assertion) {

      if (!assertion) {

        if (exercise.color !== "orange") {
          actions.update_exercise({id: exercise.id, key: "color", value: "orange"});
        }
        
        Array.prototype.shift.call(arguments); 
        this.error('('+exercise.name+')', ...arguments);

      } else {

        if (exercise.color === "") {
          actions.update_exercise({id: exercise.id, key: "color", value: "green"});
        }
        
      }


    }

    evaluation_console.assert = closing_assert

    to_evaluate(evaluation_console);

    exercise.tries.push(to_evaluate)

    state.exercises[exercise.id] = exercise;

    return { exercises: state.exercises }

  },

  update_exercise: arg => state => {

    state.exercises[arg.id][arg.key] = arg.value;

    return {exercises: state.exercises};
  },

  copy_snippet: id => state => {
    var text_area = document.createElement("textarea");
    var unbracketd = state.exercises[id].editorDiv.editor.getValue();
    text_area.value = "{\n\n"+unbracketd+"\n\n}";
    document.body.appendChild(text_area);
    text_area.focus();
    text_area.select();

    try {
      var successful = document.execCommand('copy');
      if (successful) {
        alert("copied snippet! past it in the console, or wherever");
      } else {
        alert("couldn't copy :( try again?");
      }
    } catch (err) {
      console.error('Oops, unable to copy', err);
    }

    document.body.removeChild(text_area);
    window.scrollTo(0, 0);
  },

  add_exercise: exercise => state => {


    exercise.tries = [];
    exercise.color = "";
    exercise.id = state.next_id;

    const editor_div = document.createElement("div");
    editor_div.id = state.next_id+"--editor";
    // editor_div.style = "position:relative;width:90%;height:500px;border: 1px solid black;"
    const editor = ace.edit(editor_div);
    editor.setTheme('ace/theme/twilight');
    editor.getSession().setMode('ace/mode/javascript');
    editor.setFontSize(12);
    editor.getSession().setTabSize(2);
    editor.setAutoScrollEditorIntoView(true);

    const code = function_body(exercise.code);
    editor.setValue("\n"+code+"\n\n");
    const code_arr = code.split("\n");
    editor.setOption("maxLines", code_arr.length+5);


    exercise.editorDiv = editor.container;
    exercise.editorDiv.editor = editor;


    state.exercises[state.next_id] = exercise;

    return {next_id: ++state.next_id, exercises: state.exercises};

  }


}


// revisit logging nested actions and state

try {
  // for testing in older nodes, replaced export
  module.exports = { app, h };
} catch(err) {
  // not a problem, browsers are cool too
}

// export function h(name, attributes) {
function h(name, attributes) {
  var rest = []
  var children = []
  var length = arguments.length

  while (length-- > 2) rest.push(arguments[length])

  while (rest.length) {
    var node = rest.pop()

    if (node && node.pop) {
      for (length = node.length; length--; ) {
        rest.push(node[length])
      }
    } else if (node instanceof Element) {
      node.permanent = true;
      children.push(node);
    } else if (node != null && node !== true && node !== false) {
      children.push(node)
    }
  }

  return typeof name === "function"
    ? name(attributes || {}, children)
    : {
        nodeName: name,
        attributes: attributes || {},
        children: children,
        key: attributes && attributes.key
      }
}


// export function app(state, actions, view, container) {
function app(state, actions, view, container, log) {

  var map = [].map
  var rootElement = (container && container.children[0]) || null
  var oldNode = rootElement && recycleElement(rootElement)
  var lifecycle = []
  var skipRender
  var isRecycling = true
  var globalState = clone(state)

  var wiredActions = wireStateToActions([], globalState, clone(actions))

  if (log) {
    var ignore_log;
    var track = {actions: true, state: true, vdom: true};
    var totes_path;
    var log_id = 0;
    var _log = [];
    wiredActions.$ = function() {return copy(_log)};
    _log.tracking = build_log_list(actions);;
    wiredActions.$.tracking = () => copy(_log.tracking)
    wiredActions.$.ignore = (path) => {
          _log.push({ignoring: path});
          if (_log.tracking[action] !== undefined) {
            _log.tracking[action] = false
          }
        //   if (typeof path === 'string') {
        //     path = [path]
        //   };
        //   let key = path.pop();
        //   let namespace = _log.tracking;
        //   for (let step of path) {
        //     namespace = namespace[step];
        //   };
        //   namespace[key] = false;
        };
    wiredActions.$.track = (action) => {
          _log.push({tracking: action });
          if (_log.tracking[action] !== undefined) {
            _log.tracking[action] = false
          }
          // if (typeof path === 'string') {
          //   path = [path]
          // };
          // let key = path.pop();
          // let namespace = _log.tracking;
          // for (let step of path) {
          //   namespace = namespace[step];
          // };
          // namespace[key] = true;
        };
    wiredActions.$.push = (entry) => {
          _log.push(entry);
        };
    wiredActions.$.config = (config) => {
          for (let key in config) {
            track[key] = config[key]
          };
          _log.push({ config: clone(track) });
        };

    _log.push({ 
          $: log_id,
          initial_state: clone(state)
        });

    function build_log_list(target) {
      let copy;
      if (typeof target === 'function') {
        copy = true;
      } else {
        copy = {};
        for (let key in target) {
          copy[key] = build_log_list(target[key], key);
        };
      };
      return copy
    }
  }


  if (log) {
    wiredActions.$.actions = path => {
        if ( path instanceof Array ) {
            let namespace = actions;
            for (let step of path) {
              namespace = namespace[step];
            };
            console.log(namespace);
        } else if (typeof path === 'string') {
          console.log(actions[path])
        } else if (typeof path === 'boolean') {

        } else {
          return copy(actions);
        };
      };
    wiredActions.$.state = path => {
        if ( path instanceof Array ) {
            let namespace = state;
            for (let step of path) {
              namespace = namespace[step];
            };
            console.log(namespace);
        } else if (typeof path === 'string') {
          console.log(state[path])
        } else {
          return copy(state);
        };
      };
    wiredActions.$.vdom = id => {
        if ( id ) {
            let element = find_element(resolveNode(view), id);
            if ( element ) {
              return copy(element);
            } else {
              console.log('no such id');
            }
        } else {
          console.log(resolveNode(view));
        };
        function find_element(element, id) {
          if ( element.attributes ) {
            if ( element.attributes.id ) {
              if ( element.attributes.id === id ) {
                return element;
              };
            };
          };
          if ( element.children instanceof Array ) {
            for (let child of element.children) {
              let found = find_element(child, id);
                if ( found ) {
                  return found;
                }
              };
          };
          return false;
        };
      };

  }

  scheduleRender()

  return wiredActions

  function recycleElement(element) {
    return {
      nodeName: element.nodeName.toLowerCase(),
      attributes: {},
      children: map.call(element.childNodes, function(element) {
        return element.nodeType === 3 // Node.TEXT_NODE
          ? element.nodeValue
          : recycleElement(element)
      })
    }
  }

  function resolveNode(node) {
    return typeof node === "function"
        ? resolveNode(node(globalState, wiredActions))
        : node != null 
          ? node
          : ""
  }

  function render() {
    skipRender = !skipRender

    var node = resolveNode(view)

    if (container && !skipRender) {
      rootElement = patch(container, rootElement, oldNode, (oldNode = node))
      /*-log vdom-*/  if (log && !ignore_log && track.vdom) {
        let v_dom_log = {};
        v_dom_log.$ = log_id;
        let v_dom = resolveNode(view);
        v_dom_log.v_dom = copy(v_dom);
        wiredActions.$.push( v_dom_log );
      };
    }

    isRecycling = false

    while (lifecycle.length) lifecycle.pop()()
  }

  function scheduleRender() {
    if (!skipRender) {
      skipRender = true
      setTimeout(render)
    }
  }

  function clone(target, source) {
    var out = {}

    for (var i in target) out[i] = target[i]
    for (var i in source) out[i] = source[i]

    return out
  }

  function setPartialState(path, value, source) {
    var target = {}
    if (path.length) {
      target[path[0]] =
        path.length > 1
          ? setPartialState(path.slice(1), value, source[path[0]])
          : value
      return clone(source, target)
    }
    return value
  }

  function getPartialState(path, source) {
    var i = 0
    while (i < path.length) {
      source = source[path[i++]]
    }
    return source
  }

  function wireStateToActions(path, state, actions) {
    for (var key in actions) {
      typeof actions[key] === "function"
        ? (function(key, action) {
            actions[key] = function(data) {
              var result = action(data)

              if (typeof result === "function") {
                result = result(getPartialState(path, globalState), actions)
              }

              /*-log-*/ if (log) log_id++;

              /*-log actions-*/  if (log && track.actions) {
                // ?? what's this
                // rewrite using path and key
                totes_path = [];
                totes_path = path.map(x => x);
                totes_path.push(key)
                var log_action = _log.tracking;
                for (let step of totes_path) {
                  log_action = log_action[step];
                }
                if ( log_action ) {
                  let actionLog = {};
                  actionLog.$ = log_id;
                  totes_path.length === 1 ? actionLog.action = key : actionLog.action = totes_path;
                  if (data !== undefined) actionLog.args = data;
                  actionLog.return_val = copy(result);
                  _log.push( actionLog );
                  ignore_log = false;
                } else {
                  ignore_log = true;
                };
              };

              /*-log state-*/  if (log && !ignore_log && track.state) {
                // does this work with nested states?
                if (result !== undefined) {
                  let stateLog = {};
                  stateLog.$ = log_id;
                  stateLog.state = {
                      par_state: copy(result),
                      new_state: copy(state),
                    };
                  _log.push( stateLog )
                };
              };

              if (
                result &&
                result !== (state = getPartialState(path, globalState)) &&
                !result.then // !isPromise
              ) {
                scheduleRender(
                  (globalState = setPartialState(
                    path,
                    clone(state, result),
                    globalState
                  ))
                )
              }

              return result
            }
          })(key, actions[key])
        : wireStateToActions(
            path.concat(key),
            (state[key] = clone(state[key])),
            (actions[key] = clone(actions[key]))
          )
    }

    return actions
  }

  function getKey(node) {
    return node ? node.key : null
  }

  function eventListener(event) {
    return event.currentTarget.events[event.type](event)
  }

  function updateAttribute(element, name, value, oldValue, isSvg) {

    if (name === "key") {
    } else if (name === "style") {
      if (typeof value === "string") {
        element.style.cssText = value
      } else {
        if (typeof oldValue === "string") oldValue = element.style.cssText = ""
        for (var i in clone(oldValue, value)) {
          var style = value == null || value[i] == null ? "" : value[i]
          if (i[0] === "-") {
            element.style.setProperty(i, style)
          } else {
            element.style[i] = style
          }
        }
      }
    } else {
      if (name[0] === "o" && name[1] === "n") {
        name = name.slice(2)

        if (element.events) {
          if (!oldValue) oldValue = element.events[name]
        } else {
          element.events = {}
        }

        element.events[name] = value

        if (value) {
          if (!oldValue) {
            element.addEventListener(name, eventListener)
          }
        } else {
          element.removeEventListener(name, eventListener)
        }
      } else if (
        name in element &&
        name !== "list" &&
        name !== "type" &&
        name !== "draggable" &&
        name !== "spellcheck" &&
        name !== "translate" &&
        !isSvg
      ) {
        element[name] = value == null ? "" : value
      } else if (value != null && value !== false) {
        element.setAttribute(name, value)
      }

      if (value == null || value === false) {
        element.removeAttribute(name)
      }
    }
  }

  function createElement(node, isSvg) {
    if (node.permanent) return node; // ignore permanent nodes

    var element =
      typeof node === "string" || typeof node === "number"
        ? document.createTextNode(node)
        : (isSvg = isSvg || node.nodeName === "svg")
          ? document.createElementNS(
              "http://www.w3.org/2000/svg",
              node.nodeName
            )
          : document.createElement(node.nodeName)

    var attributes = node.attributes
    if (attributes) {
      if (attributes.oncreate) {
        lifecycle.push(function() {
          attributes.oncreate(element)
        })
      }

      for (var i = 0; i < node.children.length; i++) {
        element.appendChild(
          createElement(
            (node.children[i] = resolveNode(node.children[i])),
            isSvg
          )
        )
      }

      for (var name in attributes) {
        updateAttribute(element, name, attributes[name], null, isSvg)
      }
    }

    return element
  }

  function updateElement(element, oldAttributes, attributes, isSvg) {

    if (element !== undefined && element !== null) {
      if (element.permanent) return; // don't update permanent elements
    }

    for (var name in clone(oldAttributes, attributes)) {
      if (
        attributes[name] !==
        (name === "value" || name === "checked"
          ? element[name]
          : oldAttributes[name])
      ) {
        updateAttribute(
          element,
          name,
          attributes[name],
          oldAttributes[name],
          isSvg
        )
      }
    }

    var cb = isRecycling ? attributes.oncreate : attributes.onupdate
    if (cb) {
      lifecycle.push(function() {
        cb(element, oldAttributes)
      })
    }
  }

  function removeChildren(element, node) {
    var attributes = node.attributes
    if (attributes) {
      for (var i = 0; i < node.children.length; i++) {
        removeChildren(element.childNodes[i], node.children[i])
      }

      if (attributes.ondestroy) {
        attributes.ondestroy(element)
      }
    }
    return element
  }

  function removeElement(parent, element, node) {
    if (parent.permanent) return; // don't remove from permanent nodes

    function done() {
      parent.removeChild(removeChildren(element, node))
    }

    var cb = node.attributes && node.attributes.onremove
    if (cb) {
      cb(element, done)
    } else {
      done()
    }
  }

  function patch(parent, element, oldNode, node, isSvg) {

    if (node === oldNode) {
    } else if (oldNode == null || oldNode.nodeName !== node.nodeName) {

      var newElement = createElement(node, isSvg);

      parent.insertBefore(newElement, element)

      if (oldNode != null) {
        removeElement(parent, element, oldNode)
      }

      element = newElement
    } else if (oldNode.nodeName == null) {   

      element.nodeValue = node
    } else {

      if (node instanceof Element) return node;

      updateElement(
        element,
        oldNode.attributes,
        node.attributes,
        (isSvg = isSvg || node.nodeName === "svg")
      )

      var oldKeyed = {}
      var newKeyed = {}
      var oldElements = []
      var oldChildren = oldNode.children
      var children = node.children

      for (var i = 0; i < oldChildren.length; i++) {
        oldElements[i] = element.childNodes[i]

        var oldKey = getKey(oldChildren[i])
        if (oldKey != null) {
          oldKeyed[oldKey] = [oldElements[i], oldChildren[i]]
        }
      }

      var i = 0
      var k = 0

      while (k < children.length) {
        var oldKey = getKey(oldChildren[i])
        var newKey = getKey((children[k] = resolveNode(children[k])))

        if (newKeyed[oldKey]) {
          i++
          continue
        }

        if (newKey != null && newKey === getKey(oldChildren[i + 1])) {
          if (oldKey == null) {
            removeElement(element, oldElements[i], oldChildren[i])
          }
          i++
          continue
        }

        if (newKey == null || isRecycling) {
          if (oldKey == null) {
            patch(element, oldElements[i], oldChildren[i], children[k], isSvg)
            k++
          }
          i++
        } else {
          var keyedNode = oldKeyed[newKey] || []

          if (oldKey === newKey) {
            patch(element, keyedNode[0], keyedNode[1], children[k], isSvg)
            i++
          } else if (keyedNode[0]) {
            patch(
              element,
              element.insertBefore(keyedNode[0], oldElements[i]),
              keyedNode[1],
              children[k],
              isSvg
            )
          } else {
            patch(element, oldElements[i], null, children[k], isSvg)
          }

          newKeyed[newKey] = children[k]
          k++
        }
      }

      while (i < oldChildren.length) {
        if (getKey(oldChildren[i]) == null) {
          removeElement(element, oldElements[i], oldChildren[i])
        }
        i++
      }

      for (var i in oldKeyed) {
        if (!newKeyed[i]) {
          removeElement(element, oldKeyed[i][0], oldKeyed[i][1])
        }
      }
    }
    return element
  }

  function copy(thing) {
    if (isObject(thing)) {
      var clone = {};
      for(var key in thing) {
        if(thing !== null && typeof thing === 'object') {
          clone[key] = copy(thing[key]);
        } else {
          clone[key] = thing[key];
        };
      }
      return clone;
    } else if (thing instanceof Array) {
      var clone = [];
      for(var item of thing) {
        if(thing !== null && typeof thing === 'object') {
          clone.push(copy(item));
        } else {
          clone.push(item);
        };
      }
      return clone;
    } else if (thing instanceof Function) {
      var func_str = thing.toString();
      var body_start = func_str.indexOf("{") + 1;
      var body_end = func_str.lastIndexOf("}");
      var raw_body = func_str.substring(body_start, body_end);
      return new Function(raw_body);
    } else if (thing instanceof Element) {
      return thing;
    } else {
      return thing;
    }
  }

  function isObject(val) {
    if ( val === null || typeof val !== 'object' || val instanceof Array || val instanceof Element) { 
      return false; 
    } else {
      return ( (typeof val === 'function') || (typeof val === 'object') );
    }
  }
}

/*
  Copyright © 2017-present [Jorge Bucaran](https://github.com/jorgebucaran)

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/
/*
  self-logging remix: https://github.com/janke-learning/self-logging-hyperapp
*/
/*
  reusing dom elements remix: store dom elements in state (and so vdom as well) to reuse them later 
    used for persisting ace instances between rerenders in live-edit exercises
    see early return in "createElement" function
    it will stop doing anything once it reaches a dom node stored in the vdom
*/

