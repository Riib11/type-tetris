import React, { MouseEventHandler } from 'react';
import './App.css';
import { holeIdToString, Term, termToString, typeToString, variableIdToString } from './language/Syntax';
import { Put, putToString, State, Transition, transitionToString, update } from './State';

export type AppProperties = {};

export default class App extends React.Component<AppProperties, State> {
  state: State = {
    term: {case: "hole", id: 0},
    type: {case: "variable", id: 0},
    focus: undefined
  };

  render() {
    return (
      <div className="App">
        {this.viewConsole()}
        <hr />
        {this.viewGoal()}
        <hr />
        {this.viewContext()}
        <hr />
        {this.viewPalette()}
      </div>
    );
  }
  
  viewContext(): JSX.Element {
    if (this.state.focus !== undefined) {
      let variableViews: JSX.Element[] = [];
      this.state.focus.context.forEach((type, id) =>
        variableViews.push(
          <div className="context-variable">
            {variableIdToString(id)}: {typeToString(type)}
          </div>)
      );
      return (
        <div className="context">
          Context: {variableViews}
        </div>
      );
    } else
      return (<div></div>);
  }
  
  viewGoal(): JSX.Element {
    if (this.state.focus !== undefined) {
      return (
        <div className="goal">
          Goal: {typeToString(this.state.type)}
        </div>
      );
    } else
    return (<div></div>);
  }
  
  viewConsole(): JSX.Element {
    let app = this;
    function go(term: Term): JSX.Element {
      switch (term.case) {
        case "unit": return <span>{termToString(term)}</span>;
        case "variable": return <span>{termToString(term)}</span>;
        case "abstraction": {
          let bodyView = go(term.body);
          return (<span>(({variableIdToString(term.id)}: {typeToString(term.domain)}) ⇒ {bodyView})</span>);
        }
        case "application": {
          let applicantView = go(term.applicant);
          let argumentView = go(term.argument);
          return (<span>({applicantView} {argumentView})</span>);
        }
        case "hole": {
          let onClick: MouseEventHandler = e => app.setState(update(app.state, {case: "select", id: term.id}));
          let className = app.state.focus !== undefined && app.state.focus.id === term.id ? "hole focussed" : "hole";
          return (<span className={className} onClick={onClick}>#{term.id}</span>);
        }
      }
    }
    return (
      <div className="console">
        {go(this.state.term)} : {typeToString(this.state.type)}
      </div>
    )
  }
  
  viewPalette(): JSX.Element {
    if (this.state.focus !== undefined) {
      let app = this;
      let palleteItemViews: JSX.Element[] = [];

      this.state.focus.transitions.forEach((transition) => {
        switch (transition.case) {
          case "select": break;
          case "put": {
            let onClick: MouseEventHandler = e => app.setState(update(app.state, transition));
            palleteItemViews.push(
              <div className="palette-item" onClick={onClick}>
                {putToString(transition.put)}
              </div>
            );
          }
        }
      })
      return (
        <div className="palette">
          {palleteItemViews}
        </div>
      );
    } else {
      return (<div></div>);
    }
    
  }
}
