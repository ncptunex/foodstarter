import { Link } from "@tanstack/react-router";

const linkClass =
	"rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700";

const activeClass = "bg-indigo-100 text-indigo-900";

export function SiteHeader() {
	return (
		<header className="border-b border-slate-200 bg-white">
			<nav
				aria-label="Main"
				className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3"
			>
				<Link
					to="/"
					className="text-xl font-bold tracking-tight text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
				>
					Foodstarter
				</Link>
				<ul className="flex items-center gap-2">
					<li>
						<Link
							to="/"
							className={linkClass}
							activeProps={{ className: `${linkClass} ${activeClass}` }}
							activeOptions={{ exact: true }}
						>
							Home
						</Link>
					</li>
					<li>
						<Link
							to="/foods"
							className={linkClass}
							activeProps={{ className: `${linkClass} ${activeClass}` }}
						>
							Foods
						</Link>
					</li>
				</ul>
			</nav>
		</header>
	);
}
