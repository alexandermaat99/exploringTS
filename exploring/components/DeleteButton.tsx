"use client";

import React from "react";
import { deleteTrackTime } from "@/app/actions/trackActions"; // Correct import path

type DeleteButtonProps = {
  recordId: number;
  className?: string;
};

export default function DeleteButton({
  recordId,
  className,
}: DeleteButtonProps) {
  return (
    <form action={deleteTrackTime}>
      <input type="hidden" name="id" value={recordId} />
      <button
        type="submit"
        className={
          className ||
          "px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        }
        onClick={(e) => {
          if (!confirm("Are you sure you want to delete this record?")) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}
