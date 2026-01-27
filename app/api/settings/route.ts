import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, hasSettings, AppSettingsSchema } from '@/lib/settings';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const settings = await getSettings();
    const hasConfigured = await hasSettings();

    return NextResponse.json({ settings, hasConfigured });
  } catch (error) {
    console.error('[Settings API] Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate settings
    const validatedSettings = AppSettingsSchema.parse(body);

    await saveSettings(validatedSettings);

    return NextResponse.json({ 
      success: true,
      message: 'Settings saved successfully' 
    });
  } catch (error: any) {
    console.error('[Settings API] Error saving settings:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
