import { notFound } from "next/navigation";
import { getUserById } from "@/lib/admin";
import { BackLink } from "@/components/BackLink";
import { EditUserForm } from "@/components/EditUserForm";
import { DeleteUserButton } from "@/components/DeleteUserButton";
import { ROLE_LABELS } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const admin = await requireRole(Role.ADMIN);
  const { userId } = await params;
  const user = await getUserById(userId);

  if (!user) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <BackLink href="/admin/users" label="بازگشت به مدیریت کاربران" />
          <h1 className="mt-1 text-lg font-bold text-slate-900">
            ویرایش {ROLE_LABELS[user.role]}: {user.name}
          </h1>
        </div>
        {user.id !== admin.id && (
          <DeleteUserButton userId={user.id} userName={user.name} />
        )}
      </div>

      <EditUserForm
        key={user.id}
        userId={user.id}
        defaultName={user.name}
        defaultEmail={user.email}
        defaultRole={user.role}
      />
    </div>
  );
}
