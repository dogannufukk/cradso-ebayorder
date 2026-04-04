using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EbayDesign.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RenameCompanyToEbayUsernameAndAddProductCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MobilePhone",
                table: "Customers");

            migrationBuilder.RenameColumn(
                name: "CompanyName",
                table: "Customers",
                newName: "EbayUsername");

            migrationBuilder.AddColumn<string>(
                name: "EbayProductCode",
                table: "OrderItems",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EbayProductCode",
                table: "OrderItems");

            migrationBuilder.RenameColumn(
                name: "EbayUsername",
                table: "Customers",
                newName: "CompanyName");

            migrationBuilder.AddColumn<string>(
                name: "MobilePhone",
                table: "Customers",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);
        }
    }
}
