"use client";

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
        className="rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
      >
        حذف
      </button>
    </form>
  );
}
