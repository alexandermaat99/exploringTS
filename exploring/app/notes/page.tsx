"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import NoteCard from "@/components/card/note-card";

export default function Page() {
  //creates a state variable called notes, and a function to update it called setNotes
  // after the equals sign says notes can be either an array of any, or type null, this is inside the <>
  // inside the parameters is the value we're initializing notes to null, we could also initialize it an array []

  const [notes, setNotes] = useState<any[] | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getData = async () => {
      const { data } = await supabase.from("notes").select();
      setNotes(data);
    };
    getData();
  }, []);

  return (
    <div className="card-container">
      {notes &&
        notes.map((note) => (
          <NoteCard
            key={note.id}
            id={note.id}
            title={note.title}
            content={note.text}
          />
        ))}
    </div>
  );
}
