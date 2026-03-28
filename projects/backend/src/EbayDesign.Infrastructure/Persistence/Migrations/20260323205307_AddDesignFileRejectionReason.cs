using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EbayDesign.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDesignFileRejectionReason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "DesignFiles",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "DesignFiles");
        }
    }
}
