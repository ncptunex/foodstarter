import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

const highlights = [
	{
		title: "Log in seconds",
		body: "Add what you ate with its meal type, calories and optional macros.",
	},
	{
		title: "See your day",
		body: "Every entry in one list, newest first, with a running total.",
	},
	{
		title: "Stay in control",
		body: "Remove entries you logged by mistake with a single confirmation.",
	},
];

function HeroIllustration() {
	return (
		<svg
			viewBox="0 0 400 400"
			role="img"
			aria-label="A plate of food with a fork and knife"
			className="h-full w-full"
		>
			<defs>
				<linearGradient id="plate" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#ffffff" />
					<stop offset="1" stopColor="#e0e7ff" />
				</linearGradient>
			</defs>
			<circle cx="200" cy="200" r="170" fill="url(#plate)" />
			<circle
				cx="200"
				cy="200"
				r="130"
				fill="#ffffff"
				stroke="#c7d2fe"
				strokeWidth="6"
			/>
			<circle cx="165" cy="185" r="42" fill="#f87171" />
			<circle cx="155" cy="172" r="10" fill="#fecaca" opacity="0.8" />
			<path d="M200 165c0-28 20-44 44-44-2 26-18 44-44 44z" fill="#34d399" />
			<path
				d="M205 160c10-16 22-26 38-34"
				stroke="#047857"
				strokeWidth="4"
				fill="none"
				strokeLinecap="round"
			/>
			<ellipse cx="240" cy="235" rx="46" ry="30" fill="#fbbf24" />
			<ellipse cx="230" cy="228" rx="18" ry="9" fill="#fde68a" opacity="0.9" />
			<rect x="150" y="238" width="62" height="26" rx="13" fill="#a78bfa" />
			<rect
				x="22"
				y="110"
				width="12"
				height="180"
				rx="6"
				fill="#ffffff"
				opacity="0.9"
			/>
			<rect
				x="18"
				y="100"
				width="4"
				height="60"
				rx="2"
				fill="#ffffff"
				opacity="0.9"
			/>
			<rect
				x="34"
				y="100"
				width="4"
				height="60"
				rx="2"
				fill="#ffffff"
				opacity="0.9"
			/>
			<rect
				x="366"
				y="110"
				width="12"
				height="180"
				rx="6"
				fill="#ffffff"
				opacity="0.9"
			/>
		</svg>
	);
}

function Home() {
	return (
		<main className="min-h-screen bg-linear-to-br from-indigo-700 via-purple-700 to-fuchsia-700 text-white">
			<section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-8 md:grid-cols-2 md:pb-24 md:pt-16">
				<div>
					<p className="text-sm font-semibold uppercase tracking-widest text-indigo-200">
						Food tracking, simplified
					</p>
					<h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
						Know what you eat, one meal at a time.
					</h1>
					<p className="mt-6 max-w-xl text-lg text-indigo-100">
						Foodstarter is a simple place to record your meals and snacks, so
						you can see your eating habits without the clutter.
					</p>
					<div className="mt-8 flex flex-wrap gap-4">
						<Link
							to="/foods"
							className="rounded-xl bg-white px-6 py-3 font-semibold text-indigo-800 shadow-lg transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
						>
							Start tracking food
						</Link>
					</div>
				</div>

				<div className="mx-auto aspect-square w-full max-w-md rounded-3xl bg-white/10 p-6 shadow-2xl ring-1 ring-white/20 backdrop-blur">
					<HeroIllustration />
				</div>
			</section>

			<section className="bg-white text-slate-900">
				<div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
					{highlights.map((item) => (
						<div key={item.title}>
							<h2 className="text-lg font-semibold text-indigo-800">
								{item.title}
							</h2>
							<p className="mt-2 text-slate-700">{item.body}</p>
						</div>
					))}
				</div>
			</section>
		</main>
	);
}
