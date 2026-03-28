using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EbayDesign.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOtpFieldsToDesignRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OtpAttempts",
                table: "DesignRequests",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "OtpCodeHash",
                table: "DesignRequests",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OtpExpiresAt",
                table: "DesignRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OtpVerifiedUntil",
                table: "DesignRequests",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OtpAttempts",
                table: "DesignRequests");

            migrationBuilder.DropColumn(
                name: "OtpCodeHash",
                table: "DesignRequests");

            migrationBuilder.DropColumn(
                name: "OtpExpiresAt",
                table: "DesignRequests");

            migrationBuilder.DropColumn(
                name: "OtpVerifiedUntil",
                table: "DesignRequests");
        }
    }
}
