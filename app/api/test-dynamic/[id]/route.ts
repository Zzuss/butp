import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  return NextResponse.json({
    success: true,
    message: '动态路由测试成功',
    id: id,
    method: 'GET',
    url: request.url,
    timestamp: new Date().toISOString()
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  return NextResponse.json({
    success: true,
    message: '动态路由POST测试成功',
    id: id,
    method: 'POST',
    timestamp: new Date().toISOString()
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  return NextResponse.json({
    success: true,
    message: '动态路由PATCH测试成功',
    id: id,
    method: 'PATCH',
    timestamp: new Date().toISOString()
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  return NextResponse.json({
    success: true,
    message: '动态路由DELETE测试成功',
    id: id,
    method: 'DELETE',
    timestamp: new Date().toISOString()
  })
}
