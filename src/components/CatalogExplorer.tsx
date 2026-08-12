import { useEffect, useMemo, useState } from 'react'
import type { ProductCardData } from '../queries/sanity'
import ProductCard from './ui/ProductCard'

const PAGE_SIZE = 12

type SortKey = 'newest' | 'name-asc' | 'price-asc' | 'price-desc'

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
	{ value: 'newest', label: 'Newest' },
	{ value: 'name-asc', label: 'Name A-Z' },
	{ value: 'price-asc', label: 'Price: Low to High' },
	{ value: 'price-desc', label: 'Price: High to Low' },
]

interface CatalogExplorerProps {
	products: ProductCardData[]
	initialSearchParamsFromAstro: string
}

function readInitialState(initialSearchParamsFromAstro: string) {
	const params = new URLSearchParams(initialSearchParamsFromAstro)
	const q = params.get('q') ?? ''
	const sortParam = params.get('sort')
	const sort: SortKey = SORT_OPTIONS.some((option) => option.value === sortParam)
		? (sortParam as SortKey)
		: 'newest'
	const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
	return { q, sort, page }
}

function sortProducts(products: ProductCardData[], sort: SortKey): ProductCardData[] {
	switch (sort) {
		case 'name-asc':
			return products.toSorted((a, b) => a.name.localeCompare(b.name))
		case 'price-asc':
			return products.toSorted((a, b) => a.price - b.price)
		case 'price-desc':
			return products.toSorted((a, b) => b.price - a.price)
		default:
			return products.toSorted((a, b) => b._createdAt.localeCompare(a._createdAt))
	}
}

export default function CatalogExplorer({
	products,
	initialSearchParamsFromAstro,
}: CatalogExplorerProps) {
	const initialState = readInitialState(initialSearchParamsFromAstro)
	const [q, setQ] = useState(initialState.q)
	const [sort, setSort] = useState<SortKey>(initialState.sort)
	const [page, setPage] = useState(initialState.page)

	const filtered = useMemo(() => {
		const term = q.trim().toLowerCase()
		const matches = term
			? products.filter(
					(product) =>
						product.name.toLowerCase().includes(term) ||
						product.category.name.toLowerCase().includes(term),
				)
			: products
		return sortProducts(matches, sort)
	}, [products, q, sort])

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
	const currentPage = Math.min(page, totalPages)
	const startIndex = (currentPage - 1) * PAGE_SIZE
	const visibleProducts = filtered.slice(startIndex, startIndex + PAGE_SIZE)

	useEffect(() => {
		const params = new URLSearchParams()
		if (q) params.set('q', q)
		if (sort !== 'newest') params.set('sort', sort)
		if (currentPage > 1) params.set('page', String(currentPage))
		const search = params.toString()
		const url = search ? `${window.location.pathname}?${search}` : window.location.pathname
		window.history.replaceState(null, '', url)
	}, [q, sort, currentPage])

	function updateQuery(value: string) {
		setQ(value)
		setPage(1)
	}

	function updateSort(value: SortKey) {
		setSort(value)
		setPage(1)
	}

	return (
		<div>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<label className="sr-only" htmlFor="catalog-search">
					Search crystals
				</label>
				<input
					id="catalog-search"
					type="search"
					value={q}
					onChange={(event) => updateQuery(event.target.value)}
					placeholder="Search crystals…"
					className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 sm:max-w-xs"
				/>
				<label className="flex items-center gap-2 text-sm text-stone-600">
					<span className="sr-only">Sort by</span>
					<select
						value={sort}
						onChange={(event) => updateSort(event.target.value as SortKey)}
						className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800"
					>
						{SORT_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
			</div>

			{visibleProducts.length > 0 ? (
				<ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
					{visibleProducts.map((product) => (
						<li key={product._id}>
							<ProductCard product={product} />
						</li>
					))}
				</ul>
			) : (
				<p className="mt-16 text-center text-stone-500">No crystals match your search.</p>
			)}

			{totalPages > 1 ? (
				<nav className="mt-10 flex items-center justify-center gap-4" aria-label="Pagination">
					<button
						type="button"
						disabled={currentPage === 1}
						onClick={() => setPage(currentPage - 1)}
						className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-violet-700 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
					>
						Previous
					</button>
					<span className="text-sm text-stone-600">
						Page {currentPage} of {totalPages}
					</span>
					<button
						type="button"
						disabled={currentPage === totalPages}
						onClick={() => setPage(currentPage + 1)}
						className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-violet-700 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
					>
						Next
					</button>
				</nav>
			) : null}
		</div>
	)
}
