"use client";

import { ReadGame } from "@/components/free/PickGames";
import type { BuiltActivity } from "@/lib/rounds";
import { BookReader } from "./activities/BookReader";
import { ChoiceRounds } from "./activities/ChoiceRounds";
import { Clap } from "./activities/Clap";
import { DragMatch } from "./activities/DragMatch";
import { Intro } from "./activities/Intro";
import { TapPop } from "./activities/TapPop";
import { Trace } from "./activities/Trace";
import type { OnDone } from "./types";

export function ActivityHost({ built, assess, onDone }: { built: BuiltActivity; assess: boolean; onDone: OnDone }) {
  switch (built.kind) {
    case "tap-pop":
      return <TapPop bubbles={built.bubbles} onDone={onDone} />;
    case "intro":
      return <Intro items={built.items} onDone={onDone} />;
    case "listen-choose":
      return <ChoiceRounds rounds={built.rounds} variant="listen" assess={assess} onDone={onDone} />;
    case "find-same":
      return <ChoiceRounds rounds={built.rounds} variant="same" assess={assess} onDone={onDone} />;
    case "word-picture":
      return <ChoiceRounds rounds={built.rounds} variant="picture" assess={assess} onDone={onDone} />;
    case "drag-match":
      return <DragMatch screens={built.screens} assess={assess} onDone={onDone} />;
    case "trace":
      return <Trace items={built.items} onDone={onDone} />;
    case "clap":
      return <Clap rounds={built.rounds} assess={assess} onDone={onDone} />;
    case "book":
      return <BookReader bookId={built.bookId} onDone={onDone} />;
    case "sound-match":
      return <ChoiceRounds rounds={built.rounds} variant={built.mode === "first" ? "sound-first" : "sound-last"} assess={assess} onDone={onDone} />;
    case "blend":
      return <ChoiceRounds rounds={built.rounds} variant="blend" assess={assess} onDone={onDone} />;
    case "read":
      return <ReadGame skin={built.skin} rounds={built.rounds} onDone={onDone} />;
  }
}
