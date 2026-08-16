import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'

const TOAST_DURATION_MS = 6000

export default function Toaster() {
	return (
		<ToastContainer
			position="top-center"
			autoClose={TOAST_DURATION_MS}
			closeOnClick
			pauseOnHover
			limit={1}
			icon={false}
			role="status"
			toastClassName="!rounded-lg !border !border-stone-200 !bg-white !shadow-lg !text-sm !text-stone-800"
			progressClassName="bg-violet-600"
		/>
	)
}
