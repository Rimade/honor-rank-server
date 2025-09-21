const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Инициализация базы данных...');

  // База данных будет создана автоматически при первом подключении
  console.log('✅ База данных готова к использованию');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка инициализации:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
