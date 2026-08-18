import {
	type ChangeEvent,
	type Dispatch,
	type FormEventHandler,
	type SetStateAction,
	useState,
} from 'react'
import { primaryButtonClasses, primaryButtonSizeClasses } from './buttonClasses'

interface FieldState {
	text: string
	valid: boolean
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NON_EMPTY_REGEX = /\S/

const FIELD_ERRORS = {
	name: 'Please enter your name.',
	email: 'Please enter a valid email address.',
	message: 'Please enter a message.',
} as const

const LABEL_CLASSES = 'mb-2 block text-sm font-medium text-stone-700'
const INPUT_CLASSES =
	'w-full rounded-sm border-stone-300 bg-white text-stone-800 placeholder:text-stone-400 focus:border-violet-700 focus:ring-violet-700'
const ERROR_CLASSES = 'mt-1 text-sm text-red-600'
const SUBMIT_CLASSES = `${primaryButtonClasses} ${primaryButtonSizeClasses.md}`

const isInvalid = (field: FieldState) => field.text.length > 0 && !field.valid

function ContactForm() {
	const [name, setName] = useState<FieldState>({ text: '', valid: false })
	const [email, setEmail] = useState<FieldState>({ text: '', valid: false })
	const [message, setMessage] = useState<FieldState>({ text: '', valid: false })
	const [sent, setSent] = useState(false)
	const [submitError, setSubmitError] = useState(false)

	const handleChange =
		(setter: Dispatch<SetStateAction<FieldState>>, regex: RegExp) =>
		(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const { value } = event.target
			setter({ text: value, valid: regex.test(value) })
		}

	const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
		event.preventDefault()
		if (!name.valid || !email.valid || !message.valid) return

		const body = new URLSearchParams({
			'form-name': 'contact',
			name: name.text,
			email: email.text,
			message: message.text,
			'bot-field': '',
		})

		fetch('/__forms.html', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString(),
		})
			.then((response) => {
				if (response.ok) {
					setSent(true)
				} else {
					throw new Error(`Request failed with status ${response.status}`)
				}
			})
			.catch(() => setSubmitError(true))
	}

	if (sent) {
		return (
			<div className="mt-6 rounded-sm border border-stone-200 bg-white p-6 text-stone-700 shadow-sm">
				<h2 className="font-display text-2xl font-semibold tracking-tight text-stone-900">
					Message sent
				</h2>
				<p className="mt-2">
					Thanks for getting in touch. We'll get back to you as soon as we can.
				</p>
			</div>
		)
	}

	return (
		<form
			name="contact"
			method="post"
			data-netlify="true"
			onSubmit={handleSubmit}
			className="mt-6 space-y-6"
			noValidate
		>
			<input type="hidden" name="form-name" value="contact" />
			<input
				type="text"
				name="bot-field"
				tabIndex={-1}
				autoComplete="off"
				aria-hidden="true"
				className="hidden"
			/>
			<div>
				<label htmlFor="contact-name" className={LABEL_CLASSES}>
					Name
				</label>
				<input
					id="contact-name"
					type="text"
					name="name"
					value={name.text}
					placeholder="Your name"
					aria-invalid={isInvalid(name)}
					aria-describedby={isInvalid(name) ? 'contact-name-error' : undefined}
					onChange={handleChange(setName, NON_EMPTY_REGEX)}
					className={INPUT_CLASSES}
				/>
				{isInvalid(name) ? (
					<p id="contact-name-error" className={ERROR_CLASSES}>
						{FIELD_ERRORS.name}
					</p>
				) : null}
			</div>
			<div>
				<label htmlFor="contact-email" className={LABEL_CLASSES}>
					Email
				</label>
				<input
					id="contact-email"
					type="email"
					name="email"
					value={email.text}
					placeholder="you@example.com"
					aria-invalid={isInvalid(email)}
					aria-describedby={isInvalid(email) ? 'contact-email-error' : undefined}
					onChange={handleChange(setEmail, EMAIL_REGEX)}
					className={INPUT_CLASSES}
				/>
				{isInvalid(email) ? (
					<p id="contact-email-error" className={ERROR_CLASSES}>
						{FIELD_ERRORS.email}
					</p>
				) : null}
			</div>
			<div>
				<label htmlFor="contact-message" className={LABEL_CLASSES}>
					Message
				</label>
				<textarea
					id="contact-message"
					name="message"
					value={message.text}
					placeholder="How can we help?"
					rows={5}
					aria-invalid={isInvalid(message)}
					aria-describedby={isInvalid(message) ? 'contact-message-error' : undefined}
					onChange={handleChange(setMessage, NON_EMPTY_REGEX)}
					className={INPUT_CLASSES}
				/>
				{isInvalid(message) ? (
					<p id="contact-message-error" className={ERROR_CLASSES}>
						{FIELD_ERRORS.message}
					</p>
				) : null}
			</div>
			{submitError ? (
				<p className="text-sm text-red-600">
					Something went wrong and your message wasn't sent. Please try again.
				</p>
			) : null}
			<button
				type="submit"
				disabled={!name.valid || !email.valid || !message.valid}
				className={SUBMIT_CLASSES}
			>
				Send message
			</button>
		</form>
	)
}

export default ContactForm
