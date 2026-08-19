import Link from "next/link";
import { notFound } from "next/navigation";
import { AddProjectMemberForm } from "@/components/projects/members/add-project-member-form";
import { ProjectMemberList } from "@/components/projects/members/project-member-list";
import { ProjectSettingsNavigation } from "@/components/projects/project-settings-navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getMembershipManagementData } from "@/lib/db/queries/project-members";

export default async function ProjectMembersPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const admin = await requireAdmin();
  const { projectKey } = await params;
  const data = await getMembershipManagementData(db, projectKey, admin.userId);
  if (!data) notFound();

  return (
    <section>
      <ProjectSettingsNavigation
        projectKey={data.project.key}
        isAdmin
      />
      <Link href={`/projects/${data.project.key}`}>Back to {data.project.name}</Link>
      <h1>{data.project.name} members</h1>
      <p>
        {data.project.status === "archived"
          ? "This Project is archived. New members receive read-only access."
          : "New members receive immediate access."}
      </p>
      <section aria-labelledby="current-project-members">
        <h2 id="current-project-members">Current members</h2>
        <ProjectMemberList members={data.members} />
      </section>
      <section aria-labelledby="add-project-member">
        <h2 id="add-project-member">Add a member</h2>
        <AddProjectMemberForm
          projectId={data.project.id}
          projectName={data.project.name}
          candidates={data.candidates}
        />
      </section>
    </section>
  );
}