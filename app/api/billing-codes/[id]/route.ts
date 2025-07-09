import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await request.json();
    const currentBillingCode = await prisma.billingCode.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!currentBillingCode) {
      return new NextResponse("Billing code not found", { status: 404 });
    }

    // First, delete existing relationships
    await prisma.billingCodeRelation.deleteMany({
      where: {
        OR: [
          { previous_code_id: parseInt(params.id) },
          { next_code_id: parseInt(params.id) },
        ],
      },
    });

    const updatedBillingCode = await prisma.billingCode.update({
      where: { id: parseInt(params.id) },
      data: {
        code: data.code,
        title: data.title,
        description: data.description,
        section_id: data.sectionId,
        low_fee: data.low_fee,
        high_fee: data.high_fee,
        service_class: data.service_class,
        add_on_indicator: data.add_on_indicator,
        multiple_unit_indicator: data.multiple_unit_indicator,
        fee_determinant: data.fee_determinant,
        anaesthesia_indicator: data.anaesthesia_indicator,
        submit_at_100_percent: data.submit_at_100_percent,
        referring_practitioner_required: data.referring_practitioner_required,
        start_time_required: data.start_time_required,
        stop_time_required: data.stop_time_required,
        technical_fee: data.technical_fee,
        billing_record_type: data.billingRecordType,
        max_units: data.max_units,
        day_range: data.day_range,
        // Create new relationships with previous codes
        ...(data.previousCodes &&
          data.previousCodes.length > 0 && {
            previousCodes: {
              create: data.previousCodes.map((codeId: number) => ({
                previous_code_id: codeId,
              })),
            },
          }),
        // Create new relationships with next codes
        ...(data.nextCodes &&
          data.nextCodes.length > 0 && {
            nextCodes: {
              create: data.nextCodes.map((codeId: number) => ({
                next_code_id: codeId,
              })),
            },
          }),
      },
      include: {
        section: {
          include: {
            jurisdiction: {
              include: {
                provider: true,
              },
            },
          },
        },
        previousCodes: {
          select: {
            previousCode: {
              select: {
                id: true,
                code: true,
                title: true,
                section: {
                  select: {
                    code: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        nextCodes: {
          select: {
            nextCode: {
              select: {
                id: true,
                code: true,
                title: true,
                section: {
                  select: {
                    code: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Create a change log entry
    await prisma.billingCodeChangeLog.create({
      data: {
        billing_code_id: currentBillingCode.id,
        code: currentBillingCode.code,
        title: currentBillingCode.title,
        description: currentBillingCode.description,
        low_fee: currentBillingCode.low_fee,
        high_fee: currentBillingCode.high_fee,
        service_class: currentBillingCode.service_class,
        add_on_indicator: currentBillingCode.add_on_indicator,
        multiple_unit_indicator: currentBillingCode.multiple_unit_indicator,
        fee_determinant: currentBillingCode.fee_determinant,
        anaesthesia_indicator: currentBillingCode.anaesthesia_indicator,
        submit_at_100_percent: currentBillingCode.submit_at_100_percent,
        referring_practitioner_required:
          currentBillingCode.referring_practitioner_required,
        start_time_required: currentBillingCode.start_time_required,
        stop_time_required: currentBillingCode.stop_time_required,
        technical_fee: currentBillingCode.technical_fee,
        billing_record_type: currentBillingCode.billing_record_type,
        max_units: currentBillingCode.max_units,
        day_range: currentBillingCode.day_range,
      },
    });

    return NextResponse.json(updatedBillingCode);
  } catch (error) {
    console.error("Error updating billing code:", error);
    return new NextResponse("Error updating billing code", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await prisma.billingCode.delete({
      where: {
        id: parseInt(params.id),
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting billing code:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
