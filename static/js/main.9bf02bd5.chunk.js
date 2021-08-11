(this["webpackJsonptype-tetris"]=this["webpackJsonptype-tetris"]||[]).push([[0],{12:function(e,a,t){},13:function(e,a,t){},15:function(e,a,t){"use strict";t.r(a);var n=t(1),c=t.n(n),r=t(3),i=t.n(r),s=(t(12),t(4)),o=t(5),u=t(7),l=t(6);t(13);function d(e){switch(e.case){case"nil":return{case:"nil"};case"cons":return{case:"cons",head:e.head,tail:d(e.tail)}}}function p(e){var a=[];return function e(t){switch(t.case){case"nil":return;case"cons":return a.push(t.head),void e(t.tail)}}(e),a.reverse()}function h(e,a){return{case:"cons",head:e,tail:a}}function b(e){switch(e.case){case"unit":return"Unit";case"variable":return v(e.id);case"arrow":return"(".concat(b(e.domain)," -> ").concat(b(e.codomain),")")}}function v(e){return m[e%m.length]+(e>m.length?Math.floor(e/m.length).toString():"")}function f(e){switch(e.case){case"unit":return"unit";case"variable":return w(e.id);case"abstraction":return"(\u03bb ".concat(f(e.body),")");case"application":return"(".concat(f(e.applicant)," ").concat(f(e.argument),")");case"hole":return y(e.id)}}function w(e){return e.toString()}function y(e){return"?".concat(e)}var m=["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];function j(e,a){switch(e.case){case"nil":return a;case"cons":return j(e.tail,{case:"cons",key:e.key,value:e.value,tail:a})}}function g(e,a){return{case:"cons",key:e,value:a,tail:{case:"nil"}}}function x(e){return p(e).map((function(e,a){return"".concat(a,": ").concat(b(e))})).join(", ")}function k(e){var a=0;function t(){var e={case:"variable",id:a};return a++,e}return function e(a,n){switch(n.case){case"unit":return{case:"unit"};case"variable":var c=O(a,n.id);return{case:"variable",id:n.id,type:c};case"abstraction":var r=t(),i=e({case:"cons",head:r,tail:a},n.body);return{case:"abstraction",body:i,type:{case:"arrow",domain:r,codomain:P(i)}};case"application":return{case:"application",applicant:e(a,n.applicant),argument:e(a,n.argument),type:t()};case"hole":var s=t();return{case:"hole",id:n.id,type:s}}throw new Error("impossible")}({case:"nil"},e)}function O(e,a){switch(e.case){case"nil":throw new Error("variable id out-of-bounds");case"cons":return 0===a?e.head:O(e.tail,a-1)}}function E(e){var a=k(e),t=function(e){var a={case:"nil"};return e.forEach((function(e){var t=F(A(a,e[0]),A(a,e[1]));a=j(a,t)})),a}(function(e){var a={case:"cons",head:e,tail:{case:"nil"}},t={case:"nil"};return function(){switch(a.case){case"nil":return;case"cons":var e=a.head;switch(e.case){case"unit":case"variable":return;case"abstraction":return void(a=h(e.body,a));case"application":var n=[P(e.applicant),P(e.argument)],c=n[0],r=n[1];a=h(e.argument,a),a=h(e.applicant,a),t=h([c,{case:"arrow",domain:r,codomain:e.type}],t)}}}(),p(t)}(a));return{termAnn:a=function(e){var a=new Map,t=0;function n(e){var n=a.get(e);return void 0!==n||(a.set(e,t),n=t,t++),n}function c(e){switch(e.case){case"unit":return{case:"unit"};case"variable":return{case:"variable",id:n(e.id)};case"arrow":return{case:"arrow",domain:c(e.domain),codomain:c(e.codomain)}}}function r(e){switch(e.case){case"unit":return{case:"unit"};case"variable":return{case:"variable",id:e.id,type:c(e.type)};case"abstraction":return{case:"abstraction",body:r(e.body),type:c(e.type)};case"application":return{case:"application",applicant:r(e.applicant),argument:r(e.argument),type:c(e.type)};case"hole":return{case:"hole",id:e.id,type:c(e.type)}}}return r(e)}(a=C(t,a)),type:P(a),substitution:t,holeContexts:N(a)}}function C(e,a){switch(a.case){case"unit":return a;case"variable":return{case:"variable",id:a.id,type:A(e,a.type)};case"abstraction":return{case:"abstraction",body:C(e,a.body),type:A(e,a.type)};case"application":return{case:"application",applicant:C(e,a.applicant),argument:C(e,a.argument),type:A(e,a.type)};case"hole":return{case:"hole",id:a.id,type:A(e,a.type)}}}function N(e){var a=new Map;return function e(t,n){switch(n.case){case"unit":case"variable":return;case"abstraction":switch(n.type.case){case"arrow":return void e({case:"cons",head:n.type.domain,tail:t},n.body);default:throw new Error("impossible")}case"application":e(t,n.applicant),e(t,n.argument);break;case"hole":a.set(n.id,d(t))}}({case:"nil"},e),a}function S(e,a,t){switch(t.case){case"unit":return t;case"variable":return t.id===e?a:t;case"arrow":return{case:"arrow",domain:S(e,a,t.domain),codomain:S(e,a,t.codomain)}}}function A(e,a){return function(e,a){switch(e.case){case"nil":return a;case"cons":return a=A(e.tail,a),a=S(e.key,e.value,a)}}(e,a)}function F(e,a){switch(e.case){case"unit":switch(a.case){case"unit":return{case:"nil"};case"variable":return g(a.id,e);case"arrow":throw new Error("cannot unify ".concat(b(e)," with ").concat(b(a)))}break;case"variable":switch(a.case){case"unit":return g(e.id,a);case"variable":return e.id===a.id?{case:"nil"}:g(e.id,a);case"arrow":if(M(e.id,a))throw new Error("cannot unify ".concat(b(e)," with ").concat(b(a)," because of circularity on ").concat(v(e.id)));return g(e.id,a)}break;case"arrow":switch(a.case){case"unit":throw new Error("cannot unify ".concat(b(e)," with ").concat(b(a)));case"variable":if(M(a.id,a))throw new Error("cannot unify ".concat(b(e)," with ").concat(b(a)," because of circularity on ").concat(v(a.id)));return g(a.id,e);case"arrow":return j(F(e.domain,a.domain),F(a.codomain,e.codomain))}}throw new Error("impossible")}function M(e,a){switch(a.case){case"unit":return!1;case"variable":return e===a.id;case"arrow":return M(e,a.domain)||M(e,a.codomain)}}function P(e){switch(e.case){case"unit":return{case:"unit"};case"variable":case"abstraction":case"application":case"hole":return e.type}}function G(e){switch(e.case){case"unit":return"unit";case"variable":return w(e.id);case"abstraction":return"\u03bb ?";case"application":return"? ?"}}function B(e,a){switch(a.case){case"select":var t,n=E(e.term),c=function(e,a){var t=void 0;if(function e(n){switch(n.case){case"unit":case"variable":return;case"abstraction":return void e(n.body);case"application":return e(n.applicant),void e(n.argument);case"hole":n.id===a&&(t=n.type)}}(e),void 0!==t)return t;throw new Error("hole id ".concat(a," not found"))}(n.termAnn,a.id),r=N(n.termAnn),i=[];r.forEach((function(e,a){return i.push("".concat(y(a),": ").concat(x(e)))}));var s=r.get(a.id);if(void 0===s)throw new Error("hole id ".concat(a.id," not found among hole contexts"));t=s;var o=[],u=[];return u.push({case:"unit"}),u.push({case:"application"}),u.push({case:"abstraction"}),p(t).forEach((function(e,a){return u.push({case:"variable",id:a})})),u.forEach((function(t){var n;switch(t.case){case"unit":n={case:"unit"};break;case"variable":n={case:"variable",id:t.id};break;case"abstraction":n={case:"abstraction",body:{case:"hole",id:-1}};break;case"application":n={case:"application",applicant:{case:"hole",id:-1},argument:{case:"hole",id:-1}}}var c=I(e.term,a.id,n);c=J(c);try{E(c),o.push({case:"put",put:t})}catch(r){}})),{term:e.term,type:n.type,focus:{id:a.id,type:c,context:t,transitions:o}};case"put":var l,d=e.focus;switch(a.put.case){case"unit":l={case:"unit"};break;case"variable":l={case:"variable",id:a.put.id};break;case"abstraction":l={case:"abstraction",body:{case:"hole",id:-1}};break;case"application":l={case:"application",applicant:{case:"hole",id:-1},argument:{case:"hole",id:-1}}}var h=I(e.term,d.id,l);return{term:h=J(h),type:E(h).type,focus:void 0}}throw new Error("unimplemented")}function I(e,a,t){switch(e.case){case"unit":case"variable":return e;case"abstraction":return{case:"abstraction",body:I(e.body,a,t)};case"application":return{case:"application",applicant:I(e.applicant,a,t),argument:I(e.argument,a,t)};case"hole":return e.id===a?t:e}}function J(e){var a=0;return function e(t){switch(t.case){case"unit":case"variable":return t;case"abstraction":return{case:"abstraction",body:e(t.body)};case"application":return{case:"application",applicant:e(t.applicant),argument:e(t.argument)};case"hole":return function(){var e={case:"hole",id:a};return a++,e}()}}(e)}var L=t(0),T=function(e){Object(u.a)(t,e);var a=Object(l.a)(t);function t(){var e;Object(s.a)(this,t);for(var n=arguments.length,c=new Array(n),r=0;r<n;r++)c[r]=arguments[r];return(e=a.call.apply(a,[this].concat(c))).state={term:{case:"hole",id:0},type:{case:"variable",id:0},focus:void 0},e}return Object(o.a)(t,[{key:"render",value:function(){return Object(L.jsxs)("div",{className:"App",children:[this.viewConsole(),Object(L.jsx)("hr",{}),this.viewGoal(),Object(L.jsx)("hr",{}),this.viewContext(),Object(L.jsx)("hr",{}),this.viewPalette()]})}},{key:"viewContext",value:function(){if(void 0!==this.state.focus){var e=[];return p(this.state.focus.context).forEach((function(a,t){return e.push(Object(L.jsxs)("div",{className:"context-variable",children:[w(t),": ",b(a)]}))})),Object(L.jsxs)("div",{className:"context",children:["Context: ",e]})}return Object(L.jsx)("div",{})}},{key:"viewGoal",value:function(){return void 0!==this.state.focus?Object(L.jsxs)("div",{className:"goal",children:["Goal: ",b(this.state.focus.type)]}):Object(L.jsx)("div",{})}},{key:"viewConsole",value:function(){var e=this;return Object(L.jsxs)("div",{className:"console",children:[function a(t){switch(t.case){case"unit":case"variable":return Object(L.jsx)("span",{children:f(t)});case"abstraction":var n=a(t.body);return Object(L.jsxs)("span",{children:["(\u03bb ",n,")"]});case"application":var c=a(t.applicant),r=a(t.argument);return Object(L.jsxs)("span",{children:["(",c," ",r,")"]});case"hole":var i=void 0!==e.state.focus&&e.state.focus.id===t.id?"hole focussed":"hole";return Object(L.jsx)("span",{className:i,onClick:function(a){return e.setState(B(e.state,{case:"select",id:t.id}))},children:y(t.id)})}}(this.state.term)," : ",b(this.state.type)]})}},{key:"viewPalette",value:function(){if(void 0!==this.state.focus){var e=this,a=[];return this.state.focus.transitions.forEach((function(t){switch(t.case){case"select":break;case"put":a.push(Object(L.jsx)("div",{className:"palette-item",onClick:function(a){return e.setState(B(e.state,t))},children:G(t.put)}))}})),Object(L.jsx)("div",{className:"palette",children:a})}return Object(L.jsx)("div",{})}}]),t}(c.a.Component),q=function(e){e&&e instanceof Function&&t.e(3).then(t.bind(null,16)).then((function(a){var t=a.getCLS,n=a.getFID,c=a.getFCP,r=a.getLCP,i=a.getTTFB;t(e),n(e),c(e),r(e),i(e)}))};i.a.render(Object(L.jsx)(c.a.StrictMode,{children:Object(L.jsx)(T,{})}),document.getElementById("root")),q()}},[[15,1,2]]]);
//# sourceMappingURL=main.9bf02bd5.chunk.js.map