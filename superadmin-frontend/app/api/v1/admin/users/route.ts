import { NextRequest, NextResponse } from 'next/server';
import { serverUsersDb } from '@/lib/users-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const persona = searchParams.get('persona') || 'ALL';
    const status = searchParams.get('status') || 'ALL';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Filter
    let filtered = serverUsersDb.filter((u) => {
      const matchesSearch =
        !search ||
        u.name.toLowerCase().includes(search) ||
        u.phone.includes(search) ||
        u.cnic.includes(search) ||
        u.entityName.toLowerCase().includes(search) ||
        u.city.toLowerCase().includes(search);

      const matchesPersona = persona === 'ALL' || u.persona === persona;
      const matchesStatus = status === 'ALL' || u.status === status;

      return matchesSearch && matchesPersona && matchesStatus;
    });

    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = filtered.slice(startIndex, startIndex + limit);

    // Global counts across entire DB for top cards
    const pendingKycCount = serverUsersDb.filter((u) => u.status === 'KYC_PENDING').length;
    const frozenCount = serverUsersDb.filter((u) => u.status === 'FROZEN').length;

    return NextResponse.json({
      success: true,
      data: {
        users: paginatedUsers,
        meta: {
          totalRecords,
          pendingKycCount,
          frozenCount,
          currentPage: page,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
