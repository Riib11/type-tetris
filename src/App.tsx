import React, { MouseEventHandler } from 'react';
import './App.css';
import { toArray } from './data/List';
import { holeIdToString, Term, termToString, typeToString, variableIdToString } from './language/Syntax';
import { putToString, State, update } from './State';

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
        {this.viewEnvironment()}
        {this.viewPalette()}
      </div>
    );
  }

  viewEnvironment(): JSX.Element {
    if (this.state.focus !== undefined) {
      return (
        <div className="environment">
          {this.viewContext()}
          <hr/>
          {this.viewGoal()}
        </div>
      );
    } else
      return (<div></div>);
  }
  
  viewContext(): JSX.Element {
    if (this.state.focus !== undefined) {
      let variableViews: JSX.Element[] = [];
      toArray(this.state.focus.context).forEach((type, id) =>
        variableViews.push(
          <div className="context-variable">
            {variableIdToString(id)}: {typeToString(type)}
          </div>)
      );
      return (
        <div className="context">
          {variableViews}
        </div>
      );
    } else
      return (<div></div>);
  }
  
  viewGoal(): JSX.Element {
    if (this.state.focus !== undefined) {
      return (
        <div className="goal">
          {typeToString(this.state.focus.type)}
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
          return (<span>(λ {bodyView})</span>);
        }
        case "application": {
          let applicantView = go(term.applicant);
          let argumentView = go(term.argument);
          return (<span>({applicantView} {argumentView})</span>);
        }
        case "pair": {
          let part1View = go(term.part1);
          let part2View = go(term.part2);
          return (<span>({part1View}, {part2View})</span>);
        }
        case "proj1": {
          let argumentView = go(term.argument);
          return (<span>(π₁ {argumentView})</span>)
        }
        case "proj2": {
          let argumentView = go(term.argument);
          return (<span>(π₂ {argumentView})</span>)
        }
        case "hole": {
          let onClick: MouseEventHandler = e => app.setState(update(app.state, {case: "select", id: term.id}));
          let className = app.state.focus !== undefined && app.state.focus.id === term.id ? "hole focussed" : "hole";
          return (<span className={className} onClick={onClick}>{holeIdToString(term.id)}</span>);
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
              <div>
                <div className="palette-item" onClick={onClick}>
                  {putToString(transition.put)}
                </div>
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
