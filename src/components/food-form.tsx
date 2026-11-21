import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useId, useState } from "react";
import { z } from "zod";
import { type MealType, mealTypes } from "#/db/schema";
import {
	fromLocalDateTimeValue,
	toLocalDateTimeValue,
	toOptionalWholeNumber,
} from "#/lib/food-utils";
import {
	type CreateFoodInput,
	createFoodFormSchema,
	type FieldErrors,
} from "#/server/food-schemas";
import { createFood } from "#/server/foods";

type FormValues = {
	name: string;
	mealType: MealType;
	calories: string;
	proteinG: string;
	carbsG: string;
	fatG: string;
	servingSize: string;
	eatenAt: string;
	notes: string;
};

const initialValues: FormValues = {
	name: "",
	mealType: mealTypes[0],
	calories: "",
	proteinG: "",
	carbsG: "",
	fatG: "",
	servingSize: "",
	eatenAt: "",
	notes: "",
};

const inputClass =
	"mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700";
const labelClass = "block text-sm font-semibold text-slate-800";
const errorClass = "mt-1 text-sm text-red-700";

function toCandidate(values: FormValues) {
	const eatenAtDate = values.eatenAt
		? fromLocalDateTimeValue(values.eatenAt)
		: null;
	return {
		name: values.name,
		mealType: values.mealType,
		calories:
			values.calories.trim() === "" ? undefined : Number(values.calories),
		proteinG: toOptionalWholeNumber(values.proteinG),
		carbsG: toOptionalWholeNumber(values.carbsG),
		fatG: toOptionalWholeNumber(values.fatG),
		servingSize: values.servingSize,
		notes: values.notes,
		eatenAt:
			eatenAtDate && !Number.isNaN(eatenAtDate.getTime())
				? eatenAtDate.toISOString()
				: values.eatenAt,
	};
}

export function FoodForm() {
	const router = useRouter();
	const createFoodFn = useServerFn(createFood);
	const baseId = useId();
	const [values, setValues] = useState<FormValues>(initialValues);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	useEffect(() => {
		setValues((prev) =>
			prev.eatenAt
				? prev
				: { ...prev, eatenAt: toLocalDateTimeValue(new Date()) },
		);
	}, []);

	const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
		setValues((prev) => ({ ...prev, [key]: value }));

	const fieldId = (key: keyof FormValues) => `${baseId}-${key}`;
	const errorId = (key: keyof FormValues) => `${baseId}-${key}-error`;

	const fieldError = (key: keyof FormValues) => {
		const message = errors[key as keyof CreateFoodInput]?.[0];
		return message ? (
			<p id={errorId(key)} className={errorClass}>
				{message}
			</p>
		) : null;
	};

	const describedBy = (key: keyof FormValues) =>
		errors[key as keyof CreateFoodInput]?.[0] ? errorId(key) : undefined;

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (pending) return;
		setFormError(null);

		const parsed = createFoodFormSchema.safeParse(toCandidate(values));
		if (!parsed.success) {
			setErrors(z.flattenError(parsed.error).fieldErrors as FieldErrors);
			return;
		}
		setErrors({});

		setPending(true);
		try {
			const result = await createFoodFn({ data: parsed.data });
			if (result.ok) {
				setValues({
					...initialValues,
					eatenAt: toLocalDateTimeValue(new Date()),
				});
				await router.invalidate();
			} else if (result.code === "validation") {
				setErrors(result.fieldErrors);
			} else {
				setFormError(result.message);
			}
		} catch {
			setFormError("Could not save the food. Please try again.");
		} finally {
			setPending(false);
		}
	};

	const macroField = (key: "proteinG" | "carbsG" | "fatG", label: string) => (
		<div className="min-w-0">
			<label htmlFor={fieldId(key)} className={labelClass}>
				{label}
			</label>
			<input
				id={fieldId(key)}
				type="text"
				inputMode="numeric"
				value={values[key]}
				onChange={(e) => setField(key, e.target.value)}
				aria-invalid={describedBy(key) ? true : undefined}
				aria-describedby={describedBy(key)}
				className={inputClass}
			/>
			{fieldError(key)}
		</div>
	);

	return (
		<form
			onSubmit={onSubmit}
			noValidate
			className="min-w-0 rounded-xl bg-white p-6 text-slate-900 shadow-lg"
		>
			<div className="space-y-4">
				<div>
					<label htmlFor={fieldId("name")} className={labelClass}>
						Name
					</label>
					<input
						id={fieldId("name")}
						type="text"
						required
						aria-required="true"
						maxLength={255}
						value={values.name}
						onChange={(e) => setField("name", e.target.value)}
						aria-invalid={describedBy("name") ? true : undefined}
						aria-describedby={describedBy("name")}
						className={inputClass}
					/>
					{fieldError("name")}
				</div>

				<div>
					<label htmlFor={fieldId("mealType")} className={labelClass}>
						Meal type
					</label>
					<select
						id={fieldId("mealType")}
						required
						aria-required="true"
						value={values.mealType}
						onChange={(e) => setField("mealType", e.target.value as MealType)}
						aria-invalid={describedBy("mealType") ? true : undefined}
						aria-describedby={describedBy("mealType")}
						className={inputClass}
					>
						{mealTypes.map((type) => (
							<option key={type} value={type}>
								{type.charAt(0).toUpperCase() + type.slice(1)}
							</option>
						))}
					</select>
					{fieldError("mealType")}
				</div>

				<div>
					<label htmlFor={fieldId("calories")} className={labelClass}>
						Calories
					</label>
					<input
						id={fieldId("calories")}
						type="number"
						required
						aria-required="true"
						min={0}
						max={100000}
						step={1}
						value={values.calories}
						onChange={(e) => setField("calories", e.target.value)}
						aria-invalid={describedBy("calories") ? true : undefined}
						aria-describedby={describedBy("calories")}
						className={inputClass}
					/>
					{fieldError("calories")}
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{macroField("proteinG", "Protein (g)")}
					{macroField("carbsG", "Carbs (g)")}
					{macroField("fatG", "Fat (g)")}
				</div>

				<div>
					<label htmlFor={fieldId("servingSize")} className={labelClass}>
						Serving size
					</label>
					<input
						id={fieldId("servingSize")}
						type="text"
						value={values.servingSize}
						onChange={(e) => setField("servingSize", e.target.value)}
						aria-invalid={describedBy("servingSize") ? true : undefined}
						aria-describedby={describedBy("servingSize")}
						className={inputClass}
					/>
					{fieldError("servingSize")}
				</div>

				<div>
					<label htmlFor={fieldId("eatenAt")} className={labelClass}>
						Eaten at
					</label>
					<input
						id={fieldId("eatenAt")}
						type="datetime-local"
						required
						value={values.eatenAt}
						onChange={(e) => setField("eatenAt", e.target.value)}
						aria-invalid={describedBy("eatenAt") ? true : undefined}
						aria-describedby={describedBy("eatenAt")}
						className={inputClass}
					/>
					{fieldError("eatenAt")}
				</div>

				<div>
					<label htmlFor={fieldId("notes")} className={labelClass}>
						Notes
					</label>
					<textarea
						id={fieldId("notes")}
						rows={3}
						maxLength={1000}
						value={values.notes}
						onChange={(e) => setField("notes", e.target.value)}
						aria-invalid={describedBy("notes") ? true : undefined}
						aria-describedby={describedBy("notes")}
						className={inputClass}
					/>
					{fieldError("notes")}
				</div>

				{formError ? (
					<p role="alert" className="text-sm font-semibold text-red-700">
						{formError}
					</p>
				) : null}

				<button
					type="submit"
					disabled={pending}
					className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white transition hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{pending ? "Saving..." : "Add food"}
				</button>
			</div>
		</form>
	);
}
