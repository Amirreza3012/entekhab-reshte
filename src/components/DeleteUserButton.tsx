"use client";

import { Trash2 } from "lucide-react";
import { deleteUserAction } from "@/app/admin/actions";

export function DeleteUserButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  return (
    <form
      action={deleteUserAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `آیا از حذف «${userName}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        حذف
      </button>
    </form>
  );
}
