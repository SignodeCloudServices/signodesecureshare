import { DocPageShell } from "@/components/signode/DocPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/signode/CodeBlock";
import {
GitBranch,
Terminal,
Github,
Package,
ShieldCheck,
BookOpen,
Rocket,
} from "lucide-react";

const GITIGNORE = `node_modules
dist
dist-ssr
*.local
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
.env
.env.local
.env.*.local
bun.lockb
`;

const README = `# Signode SecureShare Portal

Internet-facing file exchange portal for Signode. React SPA + .NET 8 Function API + SharePoint Online + Entra ID (external partners as B2B guests) + Purview DLP.

## Prerequisites
- Node.js 20+ and Bun 1.3+
- Git 2.40+ and GitHub CLI (gh)
- VS Code with the Tailwind CSS IntelliSense extension

## Getting started (local dev)
\`\`\`bash
bun install
bun run dev
\`\`\`
The app runs at http://localhost:5173.

## Structure
- \`src/pages\` — one file per route
- \`src/components/signode\` — shared Signode-branded components
- \`src/components/ui\` — Shadcn UI primitives
- \`src/lib\` — persona, folder tree, and helper utilities

## Environment
Not required for local development — all data is currently mocked. Backend integration is tracked on the Deployment Roadmap page.

## Contact
Reach Platform Engineering through the internal support channel.
`;

export function BuildGuidePage() {
  return (
    <DocPageShell
      title="Build Guide"
      subtitle="Get the SecureShare prototype source code into a real Git repository so a team can start real development."
    >
      {/* Intro */}
      <Card className="bg-[hsl(var(--signode-orange))]/5 border-[hsl(var(--signode-orange))]/40">
        <CardContent className="p-5 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-[hsl(var(--signode-orange-deep))] font-semibold">
            <BookOpen className="h-5 w-5" />
            Who this page is for
          </div>
          <p>
            You're the owner of the SecureShare initiative and this prototype is
            your working spec. This page walks you through getting the source
            code into a proper Git repository so you (or a delegated team) can
            evolve it into a production system. Written for a novice developer —
            plain English, exact commands, no assumptions.
          </p>
        </CardContent>
      </Card>

      {/* Prereqs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Step 1 — Install prerequisites
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Install these on your Windows workstation via winget:</p>
          <CodeBlock
            language="powershell"
            code={`winget install --id Git.Git -e --source winget
winget install --id GitHub.cli -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget
winget install --id Microsoft.VisualStudioCode -e --source winget

# Install Bun (JS runtime + package manager)
powershell -c "irm bun.sh/install.ps1 | iex"`}
          />
          <p className="text-xs text-muted-foreground">
            After installing, close and reopen PowerShell so the new commands
            are on your PATH.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <Badge variant="outline">git &mdash; version control</Badge>
            <Badge variant="outline">gh &mdash; GitHub CLI</Badge>
            <Badge variant="outline">node + bun &mdash; JS runtime</Badge>
            <Badge variant="outline">VS Code &mdash; editor</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Configure git */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Step 2 — Configure Git
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Tell Git who you are (uses your Signode email):</p>
          <CodeBlock
            language="powershell"
            code={`git config --global user.name "Your Name"
git config --global user.email "you@signode.com"
git config --global init.defaultBranch main
git config --global pull.rebase false`}
          />
          <p>Authenticate the GitHub CLI:</p>
          <CodeBlock language="powershell" code={`gh auth login`} />
          <p className="text-xs text-muted-foreground">
            Choose GitHub.com, HTTPS, "Login with a web browser", and follow the
            prompts. This lets <code>gh</code> create repos on your behalf.
          </p>
        </CardContent>
      </Card>

      {/* Local folder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Step 3 — Create the local project folder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Pick a home for your source code. A common convention is{" "}
            <code>C:\src\</code>. Then create the project folder and initialize
            Git inside it:
          </p>
          <CodeBlock
            language="powershell"
            code={`mkdir C:\\src\\signode-secureshare-portal
cd C:\\src\\signode-secureshare-portal
git init`}
          />
        </CardContent>
      </Card>

      {/* Gitignore + README */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Step 4 — Add a .gitignore and README
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Create a <code>.gitignore</code> at the project root so you don't
            accidentally commit dependencies, build output, or secrets:
          </p>
          <CodeBlock language="gitignore" filename=".gitignore" code={GITIGNORE} />
          <p>Add a starter README so new teammates know what this repo is:</p>
          <CodeBlock language="markdown" filename="README.md" code={README} />
        </CardContent>
      </Card>

      {/* First commit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Step 5 — Make your first commit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Once you have the source code in the folder, stage and commit it:</p>
          <CodeBlock
            language="powershell"
            code={`git add .
git status         # verify what's about to be committed
git commit -m "Initial commit: SecureShare portal prototype"`}
          />
          <p className="text-xs text-muted-foreground">
            The <code>git status</code> step is optional but worth it — it shows
            you exactly what's staged. If you see anything unexpected (like a{" "}
            <code>node_modules</code> folder), double-check your .gitignore.
          </p>
        </CardContent>
      </Card>

      {/* Push to GitHub */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Step 6 — Create the GitHub repo and push
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Use <code>gh</code> to create a private repo in your Signode
            organization (or your personal account if you don't have org access
            yet) and push in one command:
          </p>
          <CodeBlock
            language="powershell"
            code={`gh repo create signode-secureshare-portal --private --source=. --remote=origin --push`}
          />
          <p>
            When it finishes, <code>gh</code> will print the URL of the new
            repo. Open it in your browser to confirm your files are there.
          </p>
        </CardContent>
      </Card>

      {/* Branch protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Step 7 — Protect the main branch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Once other developers join, you don't want anyone (including
            future-you) pushing broken code straight to main. Set up branch
            protection so all changes go through pull requests:
          </p>
          <ol className="ml-5 list-decimal space-y-1">
            <li>Open the repo on GitHub &rarr; Settings &rarr; Branches</li>
            <li>Click "Add branch ruleset" (or the classic "Add rule")</li>
            <li>Set branch name pattern to <code>main</code></li>
            <li>Require pull request before merging (at least 1 approval)</li>
            <li>Require status checks to pass before merging</li>
            <li>Do not allow force pushes</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            You can also do this via CLI once you're comfortable — the GitHub
            docs cover <code>gh api</code> for branch protection rules.
          </p>
        </CardContent>
      </Card>

      {/* Verify local */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Step 8 — Verify the app runs locally
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Install dependencies and start the dev server:</p>
          <CodeBlock
            language="powershell"
            code={`bun install
bun run dev`}
          />
          <p>
            Vite prints a URL (usually <code>http://localhost:5173</code>) —
            open it in a browser to confirm the app renders.
          </p>
          <p className="text-xs text-muted-foreground">
            If <code>bun install</code> fails with permission errors on a
            corporate laptop, fall back to <code>npm install</code>. Both
            produce a working <code>node_modules</code> folder; <code>bun run
            dev</code> and <code>bun run build</code> continue to work.
          </p>
        </CardContent>
      </Card>

      {/* Ongoing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Step 9 — Day-to-day workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>For every change you make from here on:</p>
          <CodeBlock
            language="powershell"
            code={`# Start from a fresh main
git checkout main
git pull

# Create a feature branch
git checkout -b feature/add-something

# ...make your edits, then...
git add .
git commit -m "Add something meaningful"
git push -u origin feature/add-something

# Open a pull request
gh pr create --fill --web`}
          />
          <p className="text-xs text-muted-foreground">
            The <code>--web</code> flag opens the PR in your browser so you can
            fill in a description and request reviewers.
          </p>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting cheatsheet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <TroubleRow
            problem={`"gh: command not recognized"`}
            fix="Close and reopen PowerShell after installing. If still missing, install directly from cli.github.com."
          />
          <TroubleRow
            problem={`bun install fails with EPERM on Windows`}
            fix="Antivirus is locking files. Fall back to npm install, or add C:\\src to Defender exclusions."
          />
          <TroubleRow
            problem={`git says "please tell me who you are"`}
            fix="Re-run the git config commands from Step 2. Your email must match your GitHub account."
          />
          <TroubleRow
            problem={`Push rejected with "authentication required"`}
            fix="Run gh auth login again. Or use gh auth status to check your current session."
          />
          <TroubleRow
            problem={`node_modules ended up committed`}
            fix="Add node_modules to .gitignore, then run: git rm -r --cached node_modules && git commit -m 'Remove node_modules'"
          />
        </CardContent>
      </Card>

      {/* What next */}
      <Card className="bg-[hsl(var(--signode-black))] text-white">
        <CardContent className="p-6 space-y-2">
          <div className="text-xs uppercase tracking-widest text-[hsl(var(--signode-orange-soft))] font-semibold">
            What comes next
          </div>
          <p className="text-sm text-white/90">
            Once the source is in GitHub, head to the{" "}
            <strong>Deployment Roadmap</strong> to see the 10-step Dev
            deployment plan and the "Azure Portal build guide" section, and use
            the <strong>Runbooks</strong> page for the operational playbooks
            (CI/CD, IR, DR, DLP quarantine, provisioning, secret rotation,
            access reviews). All backend code and IaC templates live on the{" "}
            <strong>Source &amp; IaC</strong> page.
          </p>
        </CardContent>
      </Card>
    </DocPageShell>
  );
}

function TroubleRow({ problem, fix }: { problem: string; fix: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="font-semibold text-sm text-[hsl(var(--signode-black))]">
        {problem}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{fix}</div>
    </div>
  );
}