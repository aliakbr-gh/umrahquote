<template>
  <aside class="sidebar">
    <div class="brand"><span class="brand-mark">U</span><span>UmrahQuote</span></div>
    <nav>
      <RouterLink class="nav-item" to="/visas"><span>▣</span> Visa</RouterLink>
      <RouterLink class="nav-item" to="/hotels"><span>▤</span> Hotels</RouterLink>
      <span class="nav-item muted"><span>✈</span> Tickets <small>Soon</small></span>
      <RouterLink class="nav-item" to="/backup"><span>▧</span> Backup &amp; import</RouterLink>
    </nav>
    <div class="local-note">
      <span>●</span>
      <div>
        <strong>Local-first storage</strong>
        <p>Your records stay in this browser.</p>
      </div>
    </div>
  </aside>
</template>
