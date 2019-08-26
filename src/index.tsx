import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

import hangman00 from "./hangman00.png"
import hangman01 from "./hangman01.png"
import hangman02 from "./hangman02.png"
import hangman03 from "./hangman03.png"
import hangman04 from "./hangman04.png"
import hangman05 from "./hangman05.png"
import hangman06 from "./hangman06.png"
import hangman07 from "./hangman07.png"
import hangman08 from "./hangman08.png"
import hangman09 from "./hangman09.png"
import hangman10 from "./hangman10.png"
import hangman11 from "./hangman11.png"
import hangman12 from "./hangman12.png"
import hangman13 from "./hangman13.png"

import allWords from "./dictionary.json";

const hangman_images = [
  hangman00,
  hangman01,
  hangman02,
  hangman03,
  hangman04,
  hangman05,
  hangman06,
  hangman07,
  hangman08,
  hangman09,
  hangman10,
  hangman11,
  hangman12,
  hangman13,
]

// Top-level component. Renders either the pre-game setup menu or the main
// game selectively.
class MetaGame extends React.Component<{}, {wordLength: number}> {
  constructor(props: object) {
    super(props);
    this.state = {wordLength: NaN};
    this.playGame = this.playGame.bind(this);
    this.handleRetry = this.handleRetry.bind(this);
  }

  playGame(wordLength: number) {
    this.setState({wordLength: wordLength});
  }

  handleRetry() {
    this.setState({wordLength: NaN});
  }

  render()  {
    if (!this.state.wordLength) {
      return <StartSelector playGame={this.playGame} />;
    } else {
      return (
        <Game
           wordLength={this.state.wordLength}
           placeHolder="_"
           maxMisses={13}
           handleRetry={this.handleRetry}
        />
      );
    }
  }
}

interface StartSelectorProps {playGame: (wordLength: number) => void};

// Simple form to select the word length to play with.
class StartSelector extends React.Component<
    StartSelectorProps, {value: string}
  > {
  constructor(props: StartSelectorProps) {
    super(props);
    this.state = {value: "8"};
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.preventDefault();
    this.setState({value: e.target.value});
  }

  handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    this.props.playGame(parseInt(this.state.value));
  }

  render() {
    return (
      <div className="start-selector">
        <h1>Fiendish Hangman</h1>
        <form onSubmit={this.handleSubmit}>
          <label>
            Select a word length:
            <select value={this.state.value} onChange={this.handleChange}>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
              <option value="11">11</option>
              <option value="12">12</option>
            </select>
          </label>
          <input type="submit" value="Play" />
        </form>
      </div>
    );
  }
}

interface GameProps {
  wordLength: number,
  placeHolder: string,
  maxMisses: number,
  handleRetry: () => void,
};

interface GameState {
  misses: number,
  discoveredLetterCount: number,
  guessedLetters: Map<string, boolean>,
  revealedWord: Array<string>,
  words: Array<string>,
  finishMessage: string | null,
  gamediv: React.RefObject<HTMLDivElement>,
};

// Main Hangman game component.
class Game extends React.Component<GameProps, GameState>  {
  constructor(props: GameProps) {
    super(props)
    this.state = this.initialState();
    this.handleLetter = this.handleLetter.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.handleRetry = this.handleRetry.bind(this);
  }

  componentDidMount() {
    if (this.state.gamediv.current) {
      this.state.gamediv.current.focus();
    }
  }

  // Construct initial state, also used for reset.
  initialState(): GameState {
    let guessedLetters = new Map();
    const aCode = "A".charCodeAt(0);

    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(aCode + i);
      guessedLetters.set(letter, false);
    }

    const revealedWord = Array(this.props.wordLength).fill(
      this.props.placeHolder);

    const words = this.wordsOfLength(this.props.wordLength);

    return {
      misses: 0,
      discoveredLetterCount: 0,
      guessedLetters: guessedLetters,
      revealedWord: revealedWord,
      words: words,
      finishMessage: null,
      gamediv: React.createRef(),
    };
  }

  // Filter words by length.
  wordsOfLength(n: number): Array<string> {
    return (allWords
			.filter((word) => word.length === n)
			.map((word) => word.toUpperCase())
		);
  }

  // Handle a guessed letter.
  handleLetter(letter: string) {
    if ((letter.length !== 1) || (letter < 'A') || (letter > 'Z')) {
      throw new Error("Not a letter: " + letter);
		}

    this.setState((state: GameState, props: GameProps): GameState => {
      if (state.guessedLetters.get(letter)) {
        throw new Error("Already guessed letter: " + letter);
      }

      if (state.finishMessage) {
        return state;
      }

      let guessedLetters = new Map(state.guessedLetters);
      guessedLetters.set(letter, true);

      const splitWords = this.splitWordsByLetter(letter);
      const patternWords = this.mostFrequentPattern(
        splitWords.wordsWithLetter, letter);

      let revealedWord: Array<string>;
      let misses: number;
      let discoveredLetterCount: number;
      let words: Array<string>;

      if (splitWords.wordsWithoutLetter.length >=
          patternWords.mostFrequentMatchingWords.length) {
        console.log("Bad guess");
        revealedWord = state.revealedWord;
        misses = state.misses + 1;
        discoveredLetterCount = state.discoveredLetterCount;
        words = splitWords.wordsWithoutLetter;
      } else {
        console.log("Good guess!");
        if (patternWords.mostFrequentPattern === null) {
          throw new Error("No pattern was found");
        }

        revealedWord = patternWords.mostFrequentPattern.reveal(
          state.revealedWord);
        misses = state.misses;
        discoveredLetterCount = (
          state.discoveredLetterCount
          + patternWords.mostFrequentPattern.size
        );
        words = patternWords.mostFrequentMatchingWords;
      }

      let finishMessage = null;
      if (misses === props.maxMisses) {
        finishMessage = (
          "Too many misses. I was thinking of: " + this.randomWord(words));
      } else if (discoveredLetterCount === props.wordLength) {
        finishMessage = "You won! I was thinking of: " + revealedWord.join("");
      }

      return {
        misses: misses,
        discoveredLetterCount: discoveredLetterCount,
        guessedLetters: guessedLetters,
        revealedWord: revealedWord,
        words: words,
        finishMessage: finishMessage,
        gamediv: state.gamediv,
      };
    });
  }

  // Split our current words list into two, one with and one without a certain
  // letter.
  splitWordsByLetter(letter: string): {
      wordsWithoutLetter: Array<string>, wordsWithLetter: Array<string>} {
    let wordsWithoutLetter: Array<string> = [];
    let wordsWithLetter: Array<string> = [];

    this.state.words.forEach((word) => {
      if (word.indexOf(letter) === -1) {
        wordsWithoutLetter.push(word);
      } else {
        wordsWithLetter.push(word);
      }
    });

    return {
      wordsWithoutLetter: wordsWithoutLetter,
      wordsWithLetter: wordsWithLetter,
    }
  }

  // Find the letter pattern that matches the most words.
  mostFrequentPattern(wordsWithLetter: Array<string>, letter: string): {
        mostFrequentPattern: LetterPattern | null,
        mostFrequentMatchingWords: Array<string>,
      } {
    let mostFrequentPattern = null;
    let mostFrequentMatchingWords: Array<string> = [];

    // Algorithm for finding the most frequent pattern:
    //
    // 1. Pop the first word off
    // 2. Find all other words that match that pattern.
    // 3. Remove matching words
    // 4. Update the running count of most frequent pattern.
    // 5. Repeat until all words are exhausted.
    for (let word = wordsWithLetter.shift();
         word !== undefined;
         word = wordsWithLetter.shift()) {
      const pattern = new LetterPattern(word, letter);
      if (pattern.size === 0) {
        throw new Error("Pattern did not match");
      }

      let matchingWords = [word];

      for (let i = 0; i < wordsWithLetter.length; ) {
        if (pattern.matches(wordsWithLetter[i])) {
          matchingWords.push(wordsWithLetter[i]);
          wordsWithLetter[i] = wordsWithLetter[wordsWithLetter.length - 1];
          wordsWithLetter.pop();
        } else {
          i++;
        }
      }

      if (matchingWords.length > mostFrequentMatchingWords.length) {
        mostFrequentMatchingWords = matchingWords;
        mostFrequentPattern = pattern;
      }
    }

    return {
      mostFrequentPattern: mostFrequentPattern,
      mostFrequentMatchingWords: mostFrequentMatchingWords,
    };
  }

  // Select a word at random from our list of possibles.
  randomWord(words: Array<string>): string {
    return words[Math.floor(Math.random() * words.length)];
  }

  // Handle a key press. If any letter key is pressed we take it as the next
  // input.
  onKeyUp(e: React.KeyboardEvent<HTMLDivElement>) {
    console.log('Key pressed: ' + e.key);
    if (e.key.length !== 1) {
      return;
    }

    const upperKey = e.key.toUpperCase();
    if ((upperKey < 'A') || (upperKey > 'Z')) {
      return;
    }

    if (this.state.guessedLetters.get(upperKey)) {
      return;
    }

    console.log('Handle key event for letter: ' + upperKey);
    e.preventDefault();
    this.handleLetter(upperKey);
  }

  handleRetry() {
    this.setState(this.initialState());
    this.props.handleRetry();
  }

  // Main render function.
  render() {
    return (
      <div
        className="game"
        onKeyUp={this.onKeyUp}
        tabIndex={0}
        ref={this.state.gamediv}
      >
        <div className="game-info">
          <Hangman misses={this.state.misses} />
          <StatusColumn
            revealedWord={this.state.revealedWord}
            finishMessage={this.state.finishMessage}
            onRetry={this.handleRetry}
          />
        </div>
        <Keyboard
          handleLetter={this.handleLetter}
          guessedLetters={this.state.guessedLetters}
        />
        <p>Click keys or use your keyboard to guess a letter.</p>
      </div>
    );
  }
}

// Selects and renders a hangman image depending on the number of misses.
function Hangman(props: {misses: number}) {
  const img_src = hangman_images[props.misses]
  return (
    <img
      className="hangman-img"
      src={img_src}
      alt={
        "A poor stick man in stage "
        + props.misses
        + " of being hanged :("
      }
    />
  );
}

interface StatusColumnProps {
  revealedWord: Array<string>,
  finishMessage: string | null,
  onRetry: () => void,
}

// Display the revealed word and any extra status information.
function StatusColumn(props: StatusColumnProps) {
  const revealedWord = props.revealedWord.join(" ");

  let finishInfo = null;
  if (props.finishMessage !== null) {
    finishInfo = (
      <>
        <p>{props.finishMessage}</p>
        <button className="retry-button" onClick={props.onRetry}>
          Retry?
        </button>
      </>
    );
  }

  return (
    <div className="status-col">
      <p>Word:</p>
      <p>{revealedWord}</p>
      {finishInfo}
    </div>
  );
}

// Represents a pattern of a letter matching a word.
class LetterPattern  {

  public size: number;
  private letter: string;
  private pattern: Array<boolean>;

  // Construct a pattern for a particular letter in a word.
  constructor(word: string, letter: string) {
    this.letter = letter;
    let size = 0;
    let pattern = Array(word.length);

    for (let i = 0; i < word.length; i++) {
      if (word[i] === letter) {
        pattern[i] = true;
        size++
      } else {
        pattern[i] = false;
      }
    }

    this.size = size;
    this.pattern = pattern;
  }

  // Check if a word matches this pattern.
  matches(word: string): boolean {
    if (word.length !== this.pattern.length) {
      throw new Error("Word length does not match pattern");
    }

    for (let i = 0; i < word.length; i++) {
      if (this.pattern[i] && (word[i] !== this.letter)) {
        return false;
      } else if (!this.pattern[i] && (word[i] === this.letter)) {
        return false;
      }
    }

    return true;
  }

  // Reveals letters in this pattern in the word.
  reveal(revealedSoFar: Array<string>) {
    if (revealedSoFar.length !== this.pattern.length) {
      throw new Error("Word length does not match pattern");
    }

    let newRevealed = Array(revealedSoFar.length);

    for (let i = 0; i < revealedSoFar.length; i++) {
      if (this.pattern[i]) {
        newRevealed[i] = this.letter;
      } else {
        newRevealed[i] = revealedSoFar[i];
      }
    }

    return newRevealed;
  }
}

interface KeyboardProps {
  handleLetter: (letter: string) => void,
  guessedLetters: Map<string, boolean>,
};


function Keyboard(props: KeyboardProps) {
  return (
    <div className="keyboard">
      <KeyboardRow
         letters={["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"]}
         handleLetter={props.handleLetter}
         guessedLetters={props.guessedLetters}
      />
      <KeyboardRow
        letters={["A", "S", "D", "F", "G", "H", "J", "K", "L"]}
        handleLetter={props.handleLetter}
        guessedLetters={props.guessedLetters}
      />
      <KeyboardRow
        letters={["Z", "X", "C", "V", "B", "N", "M"]}
        handleLetter={props.handleLetter}
        guessedLetters={props.guessedLetters}
      />
    </div>
  );
}

interface KeyboardRowProps {
  handleLetter: (letter: string) => void,
  guessedLetters: Map<string, boolean>,
  letters: Array<string>,
};

class KeyboardRow extends React.Component<KeyboardRowProps, {}> {
  constructor(props: KeyboardRowProps) {
    super(props);
    this.renderLetter = this.renderLetter.bind(this);
  }

  renderLetter(letter: string) {
    if (this.props.guessedLetters.get(letter)) {
      return (
        <Key
          key={letter}
          letter={letter}
          onClick={() => null}
          className="key-guessed"
        />);
    } else {
      return (
        <Key
          key={letter}
          letter={letter}
          onClick={() => this.props.handleLetter(letter)}
          className="key"
        />);
    }
  }

  render() {
    return (
      <div className="keyboard-row">
        {this.props.letters.map(this.renderLetter)}
      </div>
    );
  }
}

interface KeyProps {
  letter: string,
  className: string,
  onClick: () => void,
}

function Key(props: KeyProps) {
  return (
    <button className={props.className} onClick={props.onClick}>
      {props.letter}
    </button>
  );
}

// ========================================

ReactDOM.render(
  <MetaGame />,
  document.getElementById("root")
);

