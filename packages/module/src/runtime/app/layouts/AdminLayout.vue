<template>
  <UDashboardGroup class="h-screen overflow-hidden">
    <AdminSidePanel />
    <UDashboardPanel class="overflow-y-auto">
      <UDashboardNavbar title="Admin" />
      <UContainer class="pt-6 pb-8">
        <slot />
      </UContainer>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
