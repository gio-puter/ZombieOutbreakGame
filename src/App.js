// import logo from './logo.svg';
import './App.css';
import React, { useEffect, useState } from 'react'
import io from 'socket.io-client'
import MaxLengthTextField from './util/MaxLengthTextField';

const queryParams = new URLSearchParams(window.location.search)

const socket = io('http://localhost:5000', {
  query: { name: queryParams.get('name'), lobby: queryParams.get('lobby')},
  autoConnect: false,
});

function App() {

  const { name, lobby } = {name: socket.io.opts.query.name ?? "", lobby: socket.io.opts.query.lobby ?? ""}

  const [state, setState] = useState({
    page: PAGE.LOGIN,

    joinName: name,
    joinLobby: lobby,
    joinError: "",
    createLobbyName: name,
    createLobbyError: "",
    name: "",
    lobby: "",

    usernames: [],
    userCount: 0,

    gameState: DEFAULT_GAME_STATE,
    lastState: {},
    fortificationPolicies: 0,
    medicalmilitaryPolicies: 0,
    outbreakPolicies: 0,
    electionTracker: 0,
    showVotes: false,
    drawSize: 34,
    discardSize: 0,
    graveyardSize: 0,
    primaryTarget: "",
    secondaryTarget: "",
  })

  useEffect(() => {
    console.log('%cState: ', 'color: cyan;', state)
  }, [state])

  const openConnection = (name, lobbyCode) => {
    socket.off('connect')
    socket.off('message')
    socket.off('disconnect')

    socket.io.opts.query = {name: name, lobby: lobbyCode}
    console.log(socket.io.opts.query)

    socket.on('connect', () => {
      console.log("%cSocket connected.", 'color: green;')

      if (state.page === PAGE.LOGIN) {
        setState(prev => {return {...prev, page: PAGE.LOBBY}})
        // setState({...state, page: PAGE.LOBBY})
      }

      setState(prev => ({
        ...prev, 
        name: name,
        lobby: lobbyCode, 
        usernames: [], 
        userCount: 0, 
        joinName: "",
        joinLobby: "",
        joinError: "",
        createLobbyName: "",
        createLobbyError: "",
      }))
    })

    // add socket.on() commands here
    socket.on('message', (msg) => {
      onWebSocketMessage(msg)
    }) 

    socket.on('disconnect', () => {
      onWebSocketClose()
    })

    socket.connect()

    return true
  }

  const onWebSocketMessage = async (msg) => {
    let message = JSON.parse(msg)

    console.log(message)
    switch (message.type) {
      case "lobby":
        setState(prev => ({
          ...prev,
          usernames: message.usernames,
          userCount: message.usernames.length,
        }))
        break;
      case "game":
        if (message !== state.gameState) {
          onGameStateChanged(message)
        }
        setState(prev => ({...prev, gameState: message, page: PAGE.GAME}))
        break;
    }
  }

  const onWebSocketClose = () => {
    console.log("%cDisconnecting from lobby", 'color: red;')
    setState(prev => ({
      ...prev,
      joinName: prev.name,
      joinLobby: prev.lobby,
      joinError: "Disconnected from the lobby",
      page: PAGE.LOGIN,
    }))
  }

  const sendWSCommand = (command, params) => {
    let data = {}
    data.name = state.name
    data.lobby = state.lobby
    data.command = command

    if (params !== undefined) {
      for (let key in params) {
        if (!data.hasOwnProperty(key)) {
          data[key] = params[key]
        }
      }
    }
    console.log(data)

    if (socket.connected) {
      socket.send(JSON.stringify(data))
    } else {
      console.log('%cCould not connect to the server.', 'color: red')
    }
  }

  const tryLogin = async (username, lobbyCode) => {
    return await fetch(`http://localhost:5000/check-login?name=${encodeURI(username)}&lobby=${encodeURI(lobbyCode)}`)
  }

  const onClickJoinLobby = () => {
    tryLogin(state.joinName, state.joinLobby)
      .then(response => {
        // console.log(response)
        return response.text().then(data => ({ok: response.ok, data}))
      })
      .then(response => {
        if (!response.ok) {
          // console.log(response.data)
        } else {
          if (!openConnection(state.joinName, state.joinLobby)) {
            console.log("%cFailed to join lobby.", 'color: red;')
          } else {
            // store lobbyCode and username in localStorage?
          }
        }
      })
      .catch(() => {
        console.log("%cThere some error contacting the server. Try again in a few.", 'color: red;')
      })
  }

  const tryCreateLobby = async (username) => {
    return await fetch(`http://localhost:5000/new-lobby`)
  }

  const onClickCreateLobby = () => {
    // console.log(state)
    tryCreateLobby().then(response => {
      if (response.ok) {
        response.text().then(lobbyCode => {
          if (!openConnection(state.createLobbyName, lobbyCode)) {
            console.log("%cFailed to create a new lobby", 'color: red;')
          } else {
            console.log("%cSuccessful lobby creation.", 'color: green;')
            // store lobbyCode and username in localStorage?
          }
        })
      } else {
        console.log("%cThere was some error connecting to the server. Try again.", 'color: red;')
      }
    })
    .catch(() => {
      console.log("%cThere was some error connecting to the server. Try again.", 'color: red;')
    })
  }

  const updateJoinLobby = (text) => {
    setState(prev => {return {...prev, joinLobby: text}})
  }

  const updateJoinName = (text) => {
    setState(prev => {return {...prev, joinName: text}})
  }

  const updateCreateLobbyName = (text) => {
    setState(prev => {return {...prev, createLobbyName: text}})
  }

  function renderLoginPage() {
    return (
      <div className="App">
        <div>
          <MaxLengthTextField 
            label={"Lobby"}
            onChange={updateJoinLobby}
            value={state.joinLobby}
            maxLength={4}
            showCharCount={false}
            forceUpperCase={true}
          />
          <MaxLengthTextField
            label={"Your Name"}
            onChange={updateJoinName}
            value={state.joinName}
            maxLength={12}
            showCharCount={true}
            forceUpperCase={false}
          />
          <button onClick={onClickJoinLobby}>JOIN LOBBY</button>
        </div>
        <br></br>
        <div>
          <MaxLengthTextField
            label={"Your Name"}
            onChange={updateCreateLobbyName}
            value={state.createLobbyName}
            maxLength={12}
            showCharCount={true}
            forceUpperCase={false}
          />
          <button onClick={onClickCreateLobby}>CREATE LOBBY</button>
        </div>
      </div>
    )
  }

  const renderPlayerList = () => {
    let out = []
    for (let i = 0; i < state.userCount; i++) {
      let name = state.usernames[i]
      let displayName = name
      if (i === 0) {
        displayName += " [*VIP*]"
      }
      out[i] = <p key={i}>{displayName}</p>
    }

    return out
  }

  const shouldStartGameBeEnabled = () => {
    // return true
    return state.userCount >= 5
  }

  const onClickStartGame = () => {
    console.log('%cStarting game', 'color: green;')
    sendWSCommand(Commands.START_GAME)
  }

  const onClickLeaveLobby = () => {
    socket.disconnect()
  }

  const onClickCopy = async () => {
    let text = document.getElementById('linkText').value; 
    try {
      await navigator.clipboard.writeText(text)
      console.log(`%cCopied! ${text}`, 'color: green;')
    } catch (err) {
      console.log("%cBig copy error", 'color: red;')
    }
  }

  function renderLobbyPage() {
    let isVIP = (state.usernames.length > 0 && state.usernames[0] === state.name)
    return (
      <div className="App">
        <div>
          <h2>LOBBY CODE: </h2>
          <h2>{state.lobby}</h2>
        </div>

        <p>Copy and share this link to invite other players</p>
        <div>
          <textarea id='linkText' readOnly={true} value={`http://localhost:3000/?lobby=${state.lobby}`}></textarea>
          <button onClick={onClickCopy}>COPY</button>
        </div>

        <div>
          <div>
            <div>
              <p>Players ({state.userCount}/10)</p>
            </div>

            <div>
              {renderPlayerList()}
            </div>

            <div>
              {!isVIP && <p>Only the VIP can start the game.</p>}
              <button onClick={onClickStartGame} disabled={!isVIP || !shouldStartGameBeEnabled()}>START GAME</button>
              <button onClick={onClickLeaveLobby}>LEAVE LOBBY</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const onGameStateChanged = (newState) => {
    setState(prev => ({
      ...prev,
      gameState: newState,
      fortificationPolicies: newState.fortificationPolicies,
      medicalmilitaryPolicies: newState.medicalmilitaryPolicies,
      outbreakPolicies: newState.outbreakPolicies,
      drawSize: newState.drawSize,
      discardSize: newState.discardSize,
      graveyardSize: newState.graveyardSize,
      electionTracker: newState.electionTracker,
    }))
  }

  // const onGameStateChanged = (newState) => {
  //   const oldState = state.gameState
  //   const name = state.name
  //   const isMayor = state.name === newState.mayor
  //   const isDoctor = state.name === newState.doctor
  //   const isSheriff = state.name === newState.sheriff
  //   // const tempState = newState.state

  //   if (oldState.hasOwnProperty("state") && oldState.state === "SETUP") {
  //     setState(prev => ({
  //       ...prev,
  //       fortificationPolicies: newState.fortificationPolicies,
  //       medicalmilitaryPolicies: newState.medicalmilitaryPolicies,
  //       outbreakPolicies: newState.outbreakPolicies,
  //       drawSize: newState.drawSize,
  //       discardSize: newState.discardSize,
  //       graveyardSize: newState.graveyardSize,
  //     }))
  //   }

  //   if (newState.state === "POST_LEGISLATIVE") { // could also include states where mayoral power takes place
  //     // Check if election tracker changed positions
  //     if (state.gameState.electionTracker !== newState.electionTracker) {
  //       const newPos = newState.electionTracker
  //       const advancedToThree = newPos === 0 && newState.electionTrackerAdvanced

  //       if (newPos !== 0 || advancedToThree) {
  //         // add show vote animatino

  //         let trackerPosition = newPos
  //         if (advancedToThree) {
  //           trackerPosition = 3;
  //         }

  //         // animate election tracker slide
  //       }
  //     }

  //     const fortificationChanged = newState.fortificationPolicies !== oldState.fortificationPolicies
  //     const medicalmilitaryChanged = newState.medicalmilitaryPolicies !== oldState.medicalmilitaryPolicies
  //     const outbreakChanged = newState.outbreakPolicies !== oldState.outbreakPolicies

  //     if (fortificationChanged || medicalmilitaryChanged || outbreakChanged) {
  //       // show alert with new policy enacted
  //     }

  //     // update decks, board with new policies & election tracker
  //     setState(prev => ({
  //       ...prev,
  //       fortificationPolicies: newState.fortificationPolicies,
  //       medicalmilitaryPolicies: newState.medicalmilitaryPolicies,
  //       outbreakPolicies: newState.outbreakPolicies,
  //       electionTracker: newState.electionTracker,
  //     }))
  //   }

  //   // check for state change
  //   if (newState.state !== state.gameState.state) {
  //     switch (newState.state) {
  //       case "STAFF_NOMINATION":
  //         if (newState.electionTracker === 0 && newState.fortificationPolicies === 0 && newState.medicalmilitaryPolicies === 0 && newState.outbreakPolicies === 0) {
  //           // show animation of player's role
  //         }

  //         if (isMayor) {
  //           // show nomination pop up window
  //         }

  //         break
  //     }
  //   }

  //   // update draw decks
  //   setState(prev => ({
  //     ...prev,
  //     drawSize: newState.drawSize,
  //     discardSize: newState.discardSize,
  //     graveyardSize: newState.graveyardSize,
  //   }))
  // }

  const renderGamePlayers = () => {
    console.log(state.gameState)

    let out = []
    for (let i = 0; i < state.userCount; i++) {
      let username = state.usernames[i]
      let color = 'black'

      if (state.gameState.players[username].hasOwnProperty('id')) {
        if (state.gameState.players[username].id === "TOWN" || state.gameState.players[username].id === "GHOST") {
          color = 'green'
        } else if (state.gameState.players[username].id === "INFECTED" || state.gameState.players[username].id === "INFECTED") {
          color = 'gold'
        } else if (state.gameState.players[username].id === "ZOMBIE") {
          color = 'red'
        }
      }

      out[i] = <p key={i} style={{color: color, display: "inline-block", marginRight: "1em"}}>{username}</p>
    }
    return out
  }

  const renderGameRoles = () => {
    let out = []
    let mayorUsername = state.gameState.mayor ? state.gameState.mayor.username : ""
    let doctorUsername = state.gameState.doctor ? state.gameState.doctor.username : ""
    let sheriffUsername = state.gameState.sheriff ? state.gameState.sheriff.username : ""

    out.push(<p key={0} style={{color: "green", display: "inline-block", marginRight: "1em"}}>Mayor: {mayorUsername}</p>)
    out.push(<p key={1} style={{color: "cyan", display: "inline-block", marginRight: "1em"}}>Doctor: {doctorUsername}</p>)
    out.push(<p key={2} style={{color: "cyan", display: "inline-block", marginRight: "1em"}}>Sheriff: {sheriffUsername}</p>)
    return out
  }

  const renderPlayerButtons = () => {
    let out = []

    if (state.gameState.state === GameState.MAYOR_STAFF_SELECTION && state.gameState.mayor.username === state.name) {
      // out[0] = <p key={0}>GOOD JOB</p>
      out.push(<p>Pick Doctor</p>)
      for (let i = 0; i < state.userCount; i++) {
        let username = state.usernames[i]
        if (username === state.gameState.mayor.username) {continue}
        out[out.length] = <button key={out.length} onClick={() => setState(prev => ({...prev, primaryTarget: username}))}>{username}</button>
      }
      out.push(<p>Pick Sheriff</p>)
      for (let i = 0; i < state.userCount; i++) {
        let username = state.usernames[i]
        if (username === state.gameState.mayor.username) {continue}
        out[out.length] = <button key={out.length} onClick={() => setState(prev => ({...prev, secondaryTarget: username}))}>{username}</button>
      }
      out.push(<p key={out.length}></p>)
      out.push(<button key={out.length} onClick={() => sendWSCommand(Commands.NOMINATE_SUPPORT, {primaryTarget: state.primaryTarget, secondaryTarget: state.secondaryTarget})}>SUBMIT</button>)
    }
    return out
  }

  const renderDeck = () => {
    return (
      <div>
        <p style={{color: "cyan", display: "inline-block", marginRight: "1em"}}>Draw Size: {state.drawSize}</p>
        <p style={{color: "gray", display: "inline-block", marginRight: "1em"}}>Discard Size: {state.discardSize}</p>
        <p style={{display: "inline-block", marginRight: "1em"}}>Graveyard Size: {state.graveyardSize}</p>
      </div>
    )
  }

  const renderBoard = () => {
    return (
      <div>
        <p style={{color: "green", display: "inline-block", marginRight: "1em"}}>Fortification Policies Enacted: {state.fortificationPolicies}</p>
        <p style={{color: "cyan", display: "inline-block", marginRight: "1em"}}>Medical/Military Policies Enacted: {state.medicalmilitaryPolicies}</p>
        <p style={{color: "red", display: "inline-block", marginRight: "1em"}}>Outbreak Policies Enacted: {state.outbreakPolicies}</p>
        <p>Election Tracker: {state.electionTracker}</p>
      </div>
    )
  }

  const renderVoting = () => {
    if (state.gameState.state !== GameState.MAYOR_VOTING) {return (<></>)}
    if (state.gameState.userVotes.hasOwnProperty(state.name)) {return (<p>WAITING FOR OTHERS TO VOTE...</p>)}
    return (
      <div>
        <button onClick={() => sendWSCommand(Commands.REGISTER_VOTE, {vote: true})}>KEEP</button>
        <button onClick={() => sendWSCommand(Commands.REGISTER_VOTE, {vote: false})}>REMOVE</button>
      </div>
    )
  }

  const renderChoices = () => {
    if (state.gameState.state === GameState.LEGISLATIVE_DOCTOR && state.gameState.doctor.username === state.name) {
      return (
        <div>
          <p>PICK ONE TO DISCARD</p>
          <br></br>
          <button onClick={() => {sendWSCommand(Commands.DOCTOR_CHOICE, {choice: 0})}}>{state.gameState.supportChoices[0][0]}/{state.gameState.supportChoices[0][1]}</button>
          <button onClick={() => {sendWSCommand(Commands.DOCTOR_CHOICE, {choice: 1})}}>{state.gameState.supportChoices[1][0]}/{state.gameState.supportChoices[1][1]}</button>
        </div>
      )
    } else if (state.gameState.state === GameState.LEGISLATIVE_SHERRIF && state.gameState.sheriff.username === state.name) {
      return (
        <div>
          <p>PICK ONE TO DISCARD</p>
          <br></br>
          <button onClick={() => {sendWSCommand(Commands.SHERIFF_CHOICE, {choice: 0})}}>{state.gameState.supportChoices[0][0]}/{state.gameState.supportChoices[0][1]}</button>
          <button onClick={() => {sendWSCommand(Commands.SHERIFF_CHOICE, {choice: 1})}}>{state.gameState.supportChoices[1][0]}/{state.gameState.supportChoices[1][1]}</button>
        </div>
      )
    } else if (state.gameState.state === GameState.LEGISLATIVE_MAYOR && state.gameState.mayor.username === state.name) {
      return (
        <div>
          <p>PICK ONE TO ENACT</p>
          <br></br>
          <button onClick={() => {sendWSCommand(Commands.MAYOR_CHOICE, {choice: 0})}}>{state.gameState.mayorChoices[0][0]}/{state.gameState.mayorChoices[0][1]}</button>
          <button onClick={() => {sendWSCommand(Commands.MAYOR_CHOICE, {choice: 1})}}>{state.gameState.mayorChoices[1][0]}/{state.gameState.mayorChoices[1][1]}</button>
        </div>
      )
    } else {return (<></>)}
  }

  function renderGamePage() {
    return (
      <div className='App'>
        <div>
          {renderGamePlayers()}
          <br></br>
          {renderGameRoles()}
        </div>
        <hr></hr>
        <div>
          {renderPlayerButtons()}
          {renderVoting()}
          {renderChoices()}
        </div>
        <hr></hr>
        <div>
          {renderDeck()}
          {renderBoard()}
        </div>
      </div>
    )
  }

  

  return (
    <>
    {(() => {
      switch (state.page) {
        case PAGE.LOGIN:
          return renderLoginPage()
        case PAGE.LOBBY:
          return renderLobbyPage()
        case PAGE.GAME:
          return renderGamePage()
        default:
          return null
      }
    })()}
    </>
  );
}

export default App;

// socket.on('connect', () => {
//   console.log("huh")
// }) 



/* <header className="App-header">
  <img src={logo} className="App-logo" alt="logo" />
  <p>
    Edit <code>src/App.js</code> and save to reload.
  </p>
  <a
    className="App-link"
    href="https://reactjs.org"
    target="_blank"
    rel="noopener noreferrer"
  >
    Learn React
  </a>
</header> */


const PAGE = Object.freeze({
  LOGIN: "LOGIN",
  LOBBY: "LOBBY",
  GAME: "GAME",
})

const Commands = Object.freeze({
  START_GAME: "START_GAME",
  GET_STATE: "GET_STATE",
  NOMINATE_SUPPORT: "NOMINATE_SUPPORT",
  REGISTER_VOTE: "REGISTER_VOTE",

  DOCTOR_CHOICE: "DOCTOR_CHOICE",
  SHERIFF_CHOICE: "SHERIFF_CHOICE",
  MAYOR_CHOICE: "MAYOR_CHOICE",
  END_ROUND: "END_ROUND",

  MAYOR_POWER_SELECT: "MAYOR_POWER_SELECT",
  SUPPORT_EXAMINE: "SUPPORT_EXAMINE",
  SUPPORT_EXECUTE: "SUPPORT_EXECUTE",
  INFECT_SELECT: "INFECT_SELECT",

  REGISTER_DEAD_ACTION: "REGISTER_DEAD_ACTION",
  REGISTER_PEEK: "REGISTER_PEEK",
  REGISTER_GIVE_INTEL: "REGISTER_GIVE_INTEL",
  REGISTER_FORCE_EXAMINE: "REGISTER_FORCE_EXAMINE",
  REGISTER_FORCE_EXECUTE: "REGISTER_FORCE_EXECUTE",
  REGISTER_FORCE_ELECTION: "REGISTER_FORCE_ELECTION",
})

const DEFAULT_GAME_STATE = {
  "fortificationPolicies": 0,
  "medicalmilitaryPolicies": 0,
  "outbreakPolicies": 0,
  "drawSize": 0,
  "discardSize": 0,
  "graveyardSize": 0,
  "players": {},
  "inGame": true,
  "playerOrder": [],
  "state": "SETUP",
  "mayor": {},
  "doctor": {},
  "sheriff": {},
  "electionTracker": 0,
  "userVotes" : {},
}

const GameState = Object.freeze({
  SETUP: "SETUP", //setup game: cards, initial mayor, allegiances, etc.
  MAYOR_STAFF_SELECTION: "MAYOR_STAFF_SELECTION", //mayor appoints sherrif and doctor
  MAYOR_VOTING: "MAYOR_VOTING", // towns votes on if mayor should stay
  
  LEGISLATIVE_DOCTOR: "LEGISLATIVE_DOCTOR", // doctor selects card to give mayor
  LEGISLATIVE_SHERRIF: "LEGISLATIVE_SHERRIF", // sherrif selects card to give mayor
  LEGISLATIVE_MAYOR: "LEGISLATIVE_MAYOR", // mayor selects card to enact
  POST_LEGISLATIVE: "POST_LEGISLATIVE", // time for mayor to end round

  MAYOR_POWER_SELECTION: "MAYOR_SUPPORT_SELECTION", // mayor chooses whether doctor or sherrif uses their power
  SUPPORT_POWER_EXAMINE: "SUPPORT_POWER_EXAMINE", // doctor examines player's role
  SUPPORT_POWER_EXECUTE: "SUPPORT_POWER_EXECUTE", // sherrif kills player
  INFECT_SELECT: "INFECT_SELECT", // infected select player to infect

  DEAD_ACTION: "DEAD_ACTION", // dead choose their actions (ability or return card to draw pile)
  ABILITY_PEEK: "ABILITY_FORCE_ELECTION", // dead looks at top 3 cards of draw pile
  ABILITY_GIVE_INTEL: "ABILITY_FORCE_ELECTION", // dead choose player to give intel to about another player
  ABILITY_FORCE_EXAMINE: "ABILITY_FORCE_EXAMINE", // current doctor is forced to examine a player
  ABILITY_FORCE_EXECUTE: "ABILITY_FORCE_EXECUTE", // current sheriff is forced to execute a player
  ABILITY_FORCE_ELECTION: "ABILITY_FORCE_ELECTION", // election of a new mayor is forced

  TOWN_VICTORY_EXTERMINATION: "TOWN_VICTORY_EXTERMINATION", // town wins by killing all infected
  TOWN_VICTORY_FORTIFICATION: "TOWN_VICTORY_FORTIFICATION", // town wins by enacting 5 fortification cards
  INFECTED_VICTORY_SWARM: "INFECTED_VICTORY_SWARM", // infected wins by outnumbering town (only count alive infected and town)
  INFECTED_VICTORY_ELECTION: "INFECTED_VICTORY_ELECTION", // infected wins by having mayor, sherrif, doctor be infected
})