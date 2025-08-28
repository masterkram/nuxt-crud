<script setup lang="ts">
import { computed, ref, type BulletLegendItemInterface, CurveType, LegendPosition } from '#imports'

interface RevenueData {
  month: number
  revenue: number
}

interface OrdersData {
  month: number
  orders: number
}

interface CustomersData {
  month: number
  customers: number
}

// Mock data for demonstration
const revenueData = ref<RevenueData[]>([
  { month: 1, revenue: 125000 },
  { month: 2, revenue: 98000 },
  { month: 3, revenue: 145000 },
  { month: 4, revenue: 167000 },
  { month: 5, revenue: 189000 },
  { month: 6, revenue: 156000 },
  { month: 7, revenue: 178000 },
  { month: 8, revenue: 198000 },
  { month: 9, revenue: 134000 },
  { month: 10, revenue: 210000 },
  { month: 11, revenue: 187000 },
  { month: 12, revenue: 224000 },
])

const ordersData = ref<OrdersData[]>([
  { month: 1, orders: 342 },
  { month: 2, orders: 287 },
  { month: 3, orders: 398 },
  { month: 4, orders: 456 },
  { month: 5, orders: 521 },
  { month: 6, orders: 434 },
  { month: 7, orders: 489 },
  { month: 8, orders: 567 },
  { month: 9, orders: 378 },
  { month: 10, orders: 612 },
  { month: 11, orders: 543 },
  { month: 12, orders: 678 },
])

const customersData = ref<CustomersData[]>([
  { month: 1, customers: 1250 },
  { month: 2, customers: 1320 },
  { month: 3, customers: 1456 },
  { month: 4, customers: 1634 },
  { month: 5, customers: 1798 },
  { month: 6, customers: 1923 },
  { month: 7, customers: 2087 },
  { month: 9, customers: 2345 },
  { month: 10, customers: 2456 },
  { month: 11, customers: 2567 },
  { month: 12, customers: 2698 },
])

// Chart categories
const revenueCategories: Record<string, BulletLegendItemInterface> = {
  revenue: { name: 'Monthly Revenue', color: '#3b82f6' },
}

const ordersCategories: Record<string, BulletLegendItemInterface> = {
  orders: { name: 'Orders', color: '#10b981' },
}

const customersCategories: Record<string, BulletLegendItemInterface> = {
  customers: { name: 'Total Customers', color: '#8b5cf6' },
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value)
}

const formatMonth = (i: number, data: RevenueData[] | OrdersData[] | CustomersData[]) => {
  return new Date(`2025-${data[i]?.month}-02`).toLocaleDateString('en-US', {
    month: 'short',
  })
}

const totalCustomers = computed(() =>
  customersData.value[customersData.value.length - 1]?.customers || 0,
)

const customersGrowth = computed(() => {
  const current = totalCustomers.value
  const previous = customersData.value[customersData.value.length - 2]?.customers || 0
  return previous > 0 ? ((current - previous) / previous * 100) : 0
})
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-semibold text-(--ui-text)">
        Dashboard
      </h1>
      <p class="text-(--ui-text-muted) mt-1">
        Welcome back! Here's what's happening with your business.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <UCard>
        <template #header>
          <div>
            <h3 class="text-lg font-medium text-(--ui-text)">
              Revenue Overview
            </h3>
            <p class="text-sm text-(--ui-text-muted) mt-1">
              Monthly revenue performance
            </p>
          </div>
        </template>

        <AreaChart
          :data="revenueData"
          :height="220"
          :categories="revenueCategories"
          :y-axis="['revenue']"
          :y-num-ticks="4"
          :curve-type="CurveType.Basis"
          :legend-position="LegendPosition.Top"
          :x-formatter="(i) => formatMonth(i, revenueData)"
          :y-formatter="formatCurrency"
        />

        <template #footer>
          <div class="flex justify-between items-center">
            <div class="text-sm text-(--ui-text-muted)">
              Best month: December ({{ formatCurrency(224000) }})
            </div>
            <UButton
              variant="link"
              color="neutral"
              size="sm"
            >
              <template #leading>
                <UIcon name="i-lucide-external-link" />
              </template>
              View details
            </UButton>
          </div>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h3 class="text-lg font-medium text-(--ui-text)">
              Orders Per Month
            </h3>
            <p class="text-sm text-(--ui-text-muted) mt-1">
              Monthly order volume
            </p>
          </div>
        </template>

        <AreaChart
          :data="ordersData"
          :height="220"
          :categories="ordersCategories"
          :y-axis="['orders']"
          :y-num-ticks="4"
          :curve-type="CurveType.Basis"
          :legend-position="LegendPosition.Top"
          :x-formatter="(i) => formatMonth(i, ordersData)"
          :y-formatter="formatNumber"
        />

        <template #footer>
          <div class="flex justify-between items-center">
            <div class="text-sm text-(--ui-text-muted)">
              Peak: {{ formatNumber(678) }} orders in December
            </div>
            <UButton
              variant="link"
              color="neutral"
              size="sm"
            >
              <template #leading>
                <UIcon name="i-lucide-external-link" />
              </template>
              View orders
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div>
          <h3 class="text-lg font-medium text-(--ui-text)">
            Customer Growth Over Time
          </h3>
          <p class="text-sm text-(--ui-text-muted) mt-1">
            Total customer base growth throughout the year
          </p>
        </div>
      </template>

      <AreaChart
        :data="customersData"
        :height="350"
        :categories="customersCategories"
        :y-axis="['customers']"
        :y-num-ticks="5"
        :curve-type="CurveType.Basis"
        :legend-position="LegendPosition.Top"
        :x-formatter="(i) => formatMonth(i, customersData)"
        :y-formatter="formatNumber"
      />

      <template #footer>
        <div class="flex justify-between items-center">
          <div class="text-sm text-(--ui-text-muted)">
            Growth rate: {{ customersGrowth.toFixed(1) }}% this month
          </div>
          <UButton
            variant="link"
            color="neutral"
            size="sm"
          >
            <template #leading>
              <UIcon name="i-lucide-external-link" />
            </template>
            Customer analytics
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>
